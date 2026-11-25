// The files waiting to be done: a few at a time, by rule, with a limit so a folder that gets thousands
// of files at once never fills the memory. Pure.
use std::{collections::VecDeque, path::PathBuf};

// More than this waiting, the rest is left for later (it is still there: the next start catches it up).
pub const QUEUE_LIMIT: usize = 500;
// Files of one rule done in one go.
pub const BATCH: usize       = 4;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Job {
    pub rule : String,
    pub path : PathBuf,
}

#[derive(Default)]
pub struct JobQueue {
    jobs        : VecDeque<Job>,
    pub dropped : usize,
}

impl JobQueue {
    // False when it was already waiting or the queue is full.
    pub fn push(&mut self, job: Job) -> bool {
        if self.jobs.contains(&job) {
            return false;
        }
        if self.jobs.len() >= QUEUE_LIMIT {
            self.dropped += 1;
            return false;
        }
        self.jobs.push_back(job);
        true
    }

    pub fn is_empty(&self) -> bool {
        self.jobs.is_empty()
    }

    // The rule of the oldest job and up to `max` of its files, in order; the other rules keep their place.
    pub fn next_batch(&mut self, max: usize) -> Option<(String, Vec<PathBuf>)> {
        let rule      = self.jobs.front()?.rule.clone();
        let mut taken = Vec::new();
        let mut rest  = VecDeque::new();
        for job in self.jobs.drain(..) {
            if job.rule == rule && taken.len() < max { taken.push(job.path) } else { rest.push_back(job) }
        }
        self.jobs = rest;
        Some((rule, taken))
    }

    // A rule paused or deleted: its files stop waiting.
    pub fn forget(&mut self, rule: &str) {
        self.jobs.retain(|job| job.rule != rule);
    }

    pub fn waiting_for(&self, rule: &str) -> usize {
        self.jobs.iter().filter(|job| job.rule == rule).count()
    }
}
