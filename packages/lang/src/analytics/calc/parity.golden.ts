/**
 * Golden legacy-processor outputs for the parity harness (#879), captured
 * from the verified legacy run before the eight processor classes were
 * deleted. This IS the regression baseline: composed-engine outputs are
 * diffed against these records; every intentional divergence is on the
 * signed accept-list in parity.test.ts.
 */
import type { MetricOrigin } from '@bitcobblers/wod-wiki-core';

export interface GoldenAnnotation {
  segment: number;
  type: string;
  unit?: string;
  origin: MetricOrigin;
  value: unknown;
}

export interface GoldenProjection {
  name: string;
  value: number;
  unit: string;
  metricType?: string;
  origin: string;
  metadata?: Record<string, unknown>;
}

export interface GoldenPath {
  annotations: GoldenAnnotation[];
  projections: GoldenProjection[];
}

export const LEGACY_GOLDEN: Record<string, GoldenPath> = {
  "1 distance": {
    "annotations": [
      {
        "segment": 0,
        "type": "pace",
        "unit": "m/s",
        "origin": "analyzed",
        "value": 4.17
      },
      {
        "segment": 0,
        "type": "pace",
        "unit": "min/km",
        "origin": "analyzed",
        "value": 4
      },
      {
        "segment": 1,
        "type": "pace",
        "unit": "m/s",
        "origin": "analyzed",
        "value": 3.33
      },
      {
        "segment": 1,
        "type": "pace",
        "unit": "min/km",
        "origin": "analyzed",
        "value": 5
      }
    ],
    "projections": [
      {
        "name": "Total Distance",
        "value": 1100,
        "unit": "m",
        "metricType": "distance",
        "origin": "analyzed"
      },
      {
        "name": "Training Load",
        "value": 25,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 5,
          "durationMinutes": 5
        }
      },
      {
        "name": "Energy",
        "value": 35,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rowing",
          "effortDiscipline": "rowing"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 37.1,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed",
        "metadata": {
          "metScore": 61.4,
          "rpeScore": 50,
          "durationScore": 5.1,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rowing",
          "effortDiscipline": "rowing"
        }
      }
    ]
  },
  "2 reps": {
    "annotations": [
      {
        "segment": 0,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 10
      },
      {
        "segment": 2,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 12
      }
    ],
    "projections": [
      {
        "name": "Total Reps",
        "value": 22,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed"
      },
      {
        "name": "Total Reps",
        "value": 22,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Burpee",
          "effortSlug": "burpee"
        }
      },
      {
        "name": "Training Load",
        "value": 13,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 5,
          "durationMinutes": 2.5
        }
      },
      {
        "name": "Energy",
        "value": 21,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "burpee",
          "effortDiscipline": "bodyweight"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 40.4,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed",
        "metadata": {
          "metScore": 73.7,
          "rpeScore": 50,
          "durationScore": 3.1,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "burpee",
          "effortDiscipline": "bodyweight"
        }
      }
    ]
  },
  "3 pace-power": {
    "annotations": [
      {
        "segment": 0,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 14
      },
      {
        "segment": 1,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 10
      },
      {
        "segment": 1,
        "type": "power",
        "unit": "kg/s",
        "origin": "analyzed",
        "value": 7.2
      },
      {
        "segment": 2,
        "type": "pace",
        "unit": "m/s",
        "origin": "analyzed",
        "value": 3.33
      },
      {
        "segment": 2,
        "type": "pace",
        "unit": "min/km",
        "origin": "analyzed",
        "value": 5
      }
    ],
    "projections": [
      {
        "name": "Total Reps",
        "value": 31,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed"
      },
      {
        "name": "Total Reps",
        "value": 31,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster"
        }
      },
      {
        "name": "Total Distance",
        "value": 400,
        "unit": "m",
        "metricType": "distance",
        "origin": "analyzed"
      },
      {
        "name": "Volume Load",
        "value": 1333,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed"
      },
      {
        "name": "Total Volume",
        "value": 903,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster",
          "totalSets": 1,
          "source": "metrics"
        }
      },
      {
        "name": "Training Load",
        "value": 23,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 5,
          "durationMinutes": 4.5
        }
      },
      {
        "name": "Energy",
        "value": 35,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rowing",
          "effortDiscipline": "rowing"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 39.3,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed",
        "metadata": {
          "metScore": 68.7,
          "rpeScore": 50,
          "durationScore": 5.2,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rowing",
          "effortDiscipline": "rowing"
        }
      }
    ]
  },
  "4 volume-pairing": {
    "annotations": [
      {
        "segment": 0,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 6.7
      },
      {
        "segment": 1,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 5.3
      },
      {
        "segment": 2,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 15
      }
    ],
    "projections": [
      {
        "name": "Total Reps",
        "value": 33,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed"
      },
      {
        "name": "Total Reps",
        "value": 18,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster"
        }
      },
      {
        "name": "Total Reps",
        "value": 15,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Burpee",
          "effortSlug": "burpee"
        }
      },
      {
        "name": "Volume Load",
        "value": 774,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed"
      },
      {
        "name": "Total Volume",
        "value": 774,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster",
          "totalSets": 2,
          "source": "metrics"
        }
      },
      {
        "name": "Training Load",
        "value": 20,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 5,
          "durationMinutes": 4
        }
      },
      {
        "name": "Energy",
        "value": 36,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "burpee",
          "effortDiscipline": "bodyweight"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 42,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed",
        "metadata": {
          "metScore": 77.9,
          "rpeScore": 50,
          "durationScore": 5.2,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "burpee",
          "effortDiscipline": "bodyweight"
        }
      }
    ]
  },
  "5 metMinutes": {
    "annotations": [],
    "projections": [
      {
        "name": "Training Load",
        "value": 110,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 5,
          "durationMinutes": 22
        }
      },
      {
        "name": "Energy",
        "value": 145,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed-estimated",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed-estimated",
          "effortSlug": "underwater-basketweaving"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 39.2,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed-estimated",
        "metadata": {
          "metScore": 57.8,
          "rpeScore": 50,
          "durationScore": 21.2,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed-estimated",
          "effortSlug": "underwater-basketweaving"
        }
      }
    ]
  },
  "6 sessionLoad-root": {
    "annotations": [
      {
        "segment": 1,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 2.1
      }
    ],
    "projections": [
      {
        "name": "Total Reps",
        "value": 21,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed"
      },
      {
        "name": "Total Reps",
        "value": 21,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster"
        }
      },
      {
        "name": "Volume Load",
        "value": 903,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed"
      },
      {
        "name": "Total Volume",
        "value": 903,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster",
          "totalSets": 1,
          "source": "metrics"
        }
      },
      {
        "name": "Training Load",
        "value": 75,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 5,
          "durationMinutes": 15
        }
      },
      {
        "name": "Energy",
        "value": 170,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed-estimated",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rest",
          "effortDiscipline": "recovery"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 37.5,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed-estimated",
        "metadata": {
          "metScore": 49.7,
          "rpeScore": 50,
          "durationScore": 24.9,
          "disciplineFactor": 0.9,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rest",
          "effortDiscipline": "recovery"
        }
      }
    ]
  },
  "6 sessionLoad-label-rpe": {
    "annotations": [],
    "projections": [
      {
        "name": "Training Load",
        "value": 70,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 7,
          "durationMinutes": 10
        }
      },
      {
        "name": "Energy",
        "value": 50,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed-estimated",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed-estimated",
          "effortSlug": "hard"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 39.3,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed-estimated",
        "metadata": {
          "metScore": 43.9,
          "rpeScore": 70,
          "durationScore": 7.3,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed-estimated",
          "effortSlug": "hard"
        }
      }
    ]
  },
  "6 sessionLoad-captured-rpe": {
    "annotations": [],
    "projections": [
      {
        "name": "Training Load",
        "value": 70,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 7,
          "durationMinutes": 10
        }
      },
      {
        "name": "Energy",
        "value": 50,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed-estimated",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed-estimated",
          "effortSlug": "hard"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 39.3,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed-estimated",
        "metadata": {
          "metScore": 43.9,
          "rpeScore": 70,
          "durationScore": 7.3,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed-estimated",
          "effortSlug": "hard"
        }
      }
    ]
  },
  "6 sessionLoad-default-rpe": {
    "annotations": [],
    "projections": [
      {
        "name": "Training Load",
        "value": 50,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 5,
          "durationMinutes": 10
        }
      },
      {
        "name": "Energy",
        "value": 50,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed-estimated",
        "metadata": {
          "usedResolvedEffort": false
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 32.3,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed-estimated",
        "metadata": {
          "metScore": 43.9,
          "rpeScore": 50,
          "durationScore": 7.3,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": false
        }
      }
    ]
  },
  "7 tis-personalized": {
    "annotations": [
      {
        "segment": 0,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 2.1
      },
      {
        "segment": 1,
        "type": "pace",
        "unit": "m/s",
        "origin": "analyzed",
        "value": 3.33
      },
      {
        "segment": 1,
        "type": "pace",
        "unit": "min/km",
        "origin": "analyzed",
        "value": 5
      }
    ],
    "projections": [
      {
        "name": "Total Reps",
        "value": 21,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed"
      },
      {
        "name": "Total Reps",
        "value": 21,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster"
        }
      },
      {
        "name": "Total Distance",
        "value": 2000,
        "unit": "m",
        "metricType": "distance",
        "origin": "analyzed"
      },
      {
        "name": "Volume Load",
        "value": 903,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed"
      },
      {
        "name": "Total Volume",
        "value": 903,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster",
          "totalSets": 1,
          "source": "metrics"
        }
      },
      {
        "name": "Training Load",
        "value": 140,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 7,
          "durationMinutes": 20
        }
      },
      {
        "name": "Energy",
        "value": 155,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rowing",
          "effortDiscipline": "rowing"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 48.1,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed",
        "metadata": {
          "metScore": 63.8,
          "rpeScore": 70,
          "durationScore": 21.3,
          "disciplineFactor": 1,
          "metMax": 12.1,
          "isEstimated": false,
          "vo2max": 42.5,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rowing",
          "effortDiscipline": "rowing"
        }
      }
    ]
  },
  "7 tis-population": {
    "annotations": [
      {
        "segment": 0,
        "type": "pace",
        "unit": "reps/min",
        "origin": "analyzed",
        "value": 2.1
      },
      {
        "segment": 1,
        "type": "pace",
        "unit": "m/s",
        "origin": "analyzed",
        "value": 3.33
      },
      {
        "segment": 1,
        "type": "pace",
        "unit": "min/km",
        "origin": "analyzed",
        "value": 5
      }
    ],
    "projections": [
      {
        "name": "Total Reps",
        "value": 21,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed"
      },
      {
        "name": "Total Reps",
        "value": 21,
        "unit": "reps",
        "metricType": "rep",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster"
        }
      },
      {
        "name": "Total Distance",
        "value": 2000,
        "unit": "m",
        "metricType": "distance",
        "origin": "analyzed"
      },
      {
        "name": "Volume Load",
        "value": 903,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed"
      },
      {
        "name": "Total Volume",
        "value": 903,
        "unit": "kg",
        "metricType": "volume",
        "origin": "analyzed",
        "metadata": {
          "exerciseName": "Thruster",
          "effortSlug": "thruster",
          "totalSets": 1,
          "source": "metrics"
        }
      },
      {
        "name": "Training Load",
        "value": 140,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 7,
          "durationMinutes": 20
        }
      },
      {
        "name": "Energy",
        "value": 155,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rowing",
          "effortDiscipline": "rowing"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 49.6,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed",
        "metadata": {
          "metScore": 68,
          "rpeScore": 70,
          "durationScore": 22.7,
          "disciplineFactor": 1,
          "metMax": 11.4,
          "isEstimated": true,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed",
          "effortSlug": "rowing",
          "effortDiscipline": "rowing"
        }
      }
    ]
  },
  "7 tis-unresolved": {
    "annotations": [],
    "projections": [
      {
        "name": "Training Load",
        "value": 50,
        "unit": "AU",
        "metricType": "load",
        "origin": "analyzed",
        "metadata": {
          "sRPE": 5,
          "durationMinutes": 10
        }
      },
      {
        "name": "Energy",
        "value": 50,
        "unit": "MET-min",
        "metricType": "work",
        "origin": "analyzed-estimated",
        "metadata": {
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed-estimated",
          "effortSlug": "underwater-basketweaving"
        }
      },
      {
        "name": "Training Intensity Score",
        "value": 31.4,
        "unit": "pts",
        "metricType": "tis",
        "origin": "analyzed-estimated",
        "metadata": {
          "metScore": 41.2,
          "rpeScore": 50,
          "durationScore": 6.9,
          "disciplineFactor": 1,
          "metMax": 12.1,
          "isEstimated": false,
          "vo2max": 42.5,
          "usedResolvedEffort": true,
          "effortOrigin": "analyzed-estimated",
          "effortSlug": "underwater-basketweaving"
        }
      }
    ]
  }
};
