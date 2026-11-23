// The Whisper models Glup can learn, pinned to one exact file each (ggerganov/whisper.cpp on Hugging
// Face, MIT, revision 5359861c). Only the level used is downloaded.
use serde::{Deserialize, Serialize};

use crate::services::background::model::ModelFile;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Level {
    // Good Spanish with the lightest download and the shortest wait.
    #[default]
    Fast,
    // The best one that still runs well on a regular computer.
    Precise,
}

pub const FAST_MODEL: ModelFile = ModelFile {
    name   : "whisper-small-q5_1.bin",
    url    : "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-small-q5_1.bin",
    sha256 : "ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb",
    size   : 190_085_487,
};

pub const PRECISE_MODEL: ModelFile = ModelFile {
    name   : "whisper-medium-q5_0.bin",
    url    : "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-medium-q5_0.bin",
    sha256 : "19fea4b380c3a618ec4723c3eef2eb785ffba0d0538cf43f8f235e7b3b34220f",
    size   : 539_212_467,
};

// Chosen by measuring a 5 min 25 s meeting in Spanish on a laptop processor (8 threads):
// small-q5_1 82 s and 2,4 % of words wrong; medium-q5_0 218 s and 1,8 %; large-v3-turbo-q5_0 352 s
// and 1,3 % (slower than the audio itself on a processor, so not for a regular computer).
// pub const PRECISE_MODEL: ModelFile = large-v3-turbo-q5_0 (574_041_195 bytes, 394221709cd5ad1f…).

impl Level {
    pub fn model(self) -> &'static ModelFile {
        match self {
            Level::Fast    => &FAST_MODEL,
            Level::Precise => &PRECISE_MODEL,
        }
    }

    // Seconds of work per second of audio, measured (0,25 and 0,67) with room for slower computers.
    pub fn work_per_second(self) -> f64 {
        match self {
            Level::Fast    => 0.35,
            Level::Precise => 0.9,
        }
    }

    // Loading the model the first time (it then stays loaded for 5 minutes).
    pub fn load_seconds(self) -> f64 {
        match self {
            Level::Fast    => 5.0,
            Level::Precise => 14.0,
        }
    }
}

// "Esto tomará unos 2 minutos": loading plus the audio, in whole seconds.
pub fn estimate_seconds(level: Level, audio_seconds: f64) -> u64 {
    (level.load_seconds() + audio_seconds.max(0.0) * level.work_per_second()).ceil() as u64
}
