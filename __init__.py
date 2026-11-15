"""Helpers for 360 equirectangular (ERP) outpainting with the Krea 2 360 outpaint LoRA.

The LoRA was trained on photos PROJECTED onto the 2:1 canvas at their real field of view
(pinhole -> equirect, straight lines curve), not pasted flat. A flat paste makes it invent
a wrong geometry and repeat the furniture.
"""
import math

import torch
import torch.nn.functional as F

GREEN = (0.0, 1.0, 0.0)  # the LoRA's "fill me" colour, pure #00FF00


class PerspToERPCanvas:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "image": ("IMAGE",),
            "width": ("INT", {"default": 1440, "min": 64, "max": 8192, "step": 16}),
            "height": ("INT", {"default": 720, "min": 32, "max": 4096, "step": 16}),
            "h_fov_deg": ("FLOAT", {"default": 90.0, "min": 20.0, "max": 170.0, "step": 1.0,
                                    "tooltip": "Horizontal field of view of the photo. Phone ~70, wide interior shot ~90, ultra-wide ~110. Bigger = the photo takes more of the panorama."}),
            "pitch_deg": ("FLOAT", {"default": 0.0, "min": -90.0, "max": 90.0, "step": 1.0,
                                    "tooltip": "Camera tilt: positive if the photo looks up, negative if it looks down."}),
        }}

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("canvas", "photo_mask")
    FUNCTION = "build"
    CATEGORY = "image/360"

    def build(self, image, width, height, h_fov_deg, pitch_deg):
        W, H = int(width), int(height)
        src = image[:1, :, :, :3].movedim(-1, 1).float().cpu()
        sh, sw = src.shape[2:]
        f = (sw / 2.0) / math.tan(math.radians(h_fov_deg) / 2.0)
        cx, cy = (sw - 1) / 2.0, (sh - 1) / 2.0
        lon = (torch.arange(W, dtype=torch.float32) + 0.5) / W * 2 * math.pi - math.pi
        lat = math.pi / 2 - (torch.arange(H, dtype=torch.float32) + 0.5) / H * math.pi
        lat_g, lon_g = torch.meshgrid(lat, lon, indexing="ij")
        cl = torch.cos(lat_g)
        dx, dy, dz = cl * torch.sin(lon_g), torch.sin(lat_g), cl * torch.cos(lon_g)
        ap = math.radians(pitch_deg)
        if ap:
            dy, dz = math.cos(ap) * dy - math.sin(ap) * dz, math.sin(ap) * dy + math.cos(ap) * dz
        front = dz > 1e-6
        dzc = torch.where(front, dz, torch.ones_like(dz))
        xf, yf = f * dx / dzc + cx, cy - f * dy / dzc
        valid = front & (xf >= 0) & (xf <= sw - 1) & (yf >= 0) & (yf <= sh - 1)
        grid = torch.stack([2 * xf / max(sw - 1, 1) - 1, 2 * yf / max(sh - 1, 1) - 1], dim=-1).unsqueeze(0)
        # the photo is minified a lot on the canvas: area-prefilter to ~2x its footprint, or the bicubic warp aliases
        tw = int(round(W * h_fov_deg / 360.0 * 2.0))
        if tw < sw:
            src = F.interpolate(src, size=(max(1, round(tw * sh / sw)), tw), mode="area")
        warped = F.grid_sample(src, grid, mode="bicubic", padding_mode="border", align_corners=True)[0].clamp(0, 1)
        a = valid.float().unsqueeze(0)
        canvas = warped * a + torch.tensor(GREEN).view(3, 1, 1) * (1 - a)
        return (canvas.movedim(0, -1).unsqueeze(0), valid.float().unsqueeze(0))


class ERPRoll:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "image": ("IMAGE",),
            "green_band": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 0.9, "step": 0.01,
                                     "tooltip": "After the 180 degree turn, paint this fraction of the width green in the middle (= what was behind the camera) so the LoRA regenerates it. 0 = just turn."}),
        }}

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "roll"
    CATEGORY = "image/360"
    DESCRIPTION = "Turn a 360 panorama by 180 degrees (left/right seam goes to the middle). Applying it twice gives the original back."

    def roll(self, image, green_band):
        W = image.shape[2]
        out = torch.roll(image[..., :3], W // 2, dims=2).clone()
        if green_band > 0:
            x0 = round(W * (0.5 - green_band / 2) / 16) * 16
            x1 = round(W * (0.5 + green_band / 2) / 16) * 16
            out[:, :, x0:x1, :] = torch.tensor(GREEN, dtype=out.dtype, device=out.device)
        return (out,)


NODE_CLASS_MAPPINGS = {"PerspToERPCanvas": PerspToERPCanvas, "ERPRoll": ERPRoll}
NODE_DISPLAY_NAME_MAPPINGS = {"PerspToERPCanvas": "Photo -> 360 canvas (perspective warp)", "ERPRoll": "360 Roll 180 (+ green back band)"}
