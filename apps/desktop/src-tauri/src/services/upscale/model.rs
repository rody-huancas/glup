// The two models of "Mejorar calidad": Real-ESRGAN (BSD-3-Clause, xinntao), ONNX exports of the official
// weights (fp32, any height and width: RGB from 0 to 1 in, four times bigger out), pinned to one revision.
use serde::Deserialize;

use crate::services::background::model::ModelFile;

// realesr-general-x4v3 (SRVGGNetCompact, 1.2 M parameters): light and quick, for any picture.
pub const FAST_MODEL: ModelFile = ModelFile {
    name     : "realesr-general-x4v3.onnx",
    url      : "https://github.com/rody-huancas/glup/releases/download/models-v1/realesr-general-x4v3.onnx",
    fallback : Some("https://huggingface.co/jonathanst29/tinier-upscale-models/resolve/899dc1e4b22bbf1955c2f1739c085edc080cb366/realesr-general-x4v3.onnx"),
    sha256   : "924ebad6532777303582d4ce7811849b88869231a3ae7093e0f21200249df8d5",
    size     : 4_866_396,
};

// RealESRGAN_x4plus (RRDBNet, 16.7 M parameters): heavier, more detail in photos.
pub const DETAIL_MODEL: ModelFile = ModelFile {
    name     : "realesrgan-x4plus.onnx",
    url      : "https://github.com/rody-huancas/glup/releases/download/models-v1/realesrgan-x4plus.onnx",
    fallback : Some("https://huggingface.co/jonathanst29/tinier-upscale-models/resolve/899dc1e4b22bbf1955c2f1739c085edc080cb366/realesrgan-x4plus.onnx"),
    sha256   : "4ed6a45a8185bde6c8d7c7790a6e80e3c5b9f608946f634021068dd0fd0473c8",
    size     : 67_051_618,
};

// The model's own scale: x2 is its x4 brought down by half (better than the model on half the photo).
pub const MODEL_SCALE: u32 = 4;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UpscaleLevel {
    // «Rápido».
    #[default]
    Fast,
    // «Más detalle».
    Detail,
}

impl UpscaleLevel {
    pub fn model(self) -> &'static ModelFile {
        match self {
            Self::Fast   => &FAST_MODEL,
            Self::Detail => &DETAIL_MODEL,
        }
    }

    // The side of the pieces it works on: the heavy model on smaller ones (memory of the card).
    pub fn tile(self) -> u32 {
        match self {
            Self::Fast   => 256,
            Self::Detail => 192,
        }
    }
}
