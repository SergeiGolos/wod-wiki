This document outlines the structure and requirements for the Data Store component of the WOD notes system, designed to store and retrieve workout information using both local storage and Supabase.  The Data Store interacts with the Results Table and potentially the Runtime to persist workout data.

## Functionality Requirements

**1. Data Input:**

* **From Results Table:** Receives structured workout results (see [[DataTypes/Result Block|Result Block]] for the data structure) after a workout is completed. This data includes metrics and timestamps.
* **From Runtime (Optional):**  Potentially receives intermediate data from the runtime during the workout if you need to track progress in real time (e.g., storing partial results or intermediate states).

**2. Data Storage:**

* **Workout Notes:**
    * Stores workout notes in a structured format (Markdown + JSON for metrics):
      ```json
      {
        "workoutId": "workout-20231027",
        "markdownNotes": "# Legs Day - 2023-10-27\n\n- Squats: 3 sets of 10 reps",
        "metrics": [
          {"type": "squats", "reps": 30},
          {"type": "lunges", "reps": 72}
        ]
      }
      ```
    * Uses unique `workoutId` for identification.
* **Persistence:**
    * Local storage (browser-based) for immediate availability.
    * Supabase (cloud-based) for persistence and synchronization.


**3. Data Retrieval:**

* **By `workoutId`:** Retrieves workout notes and associated metrics.
* **Data Output:** Provides data to the Results Table and potentially the Editor for display and editing.


**4. Synchronization:**

* The Data Store uses a [Describe Synchronization Strategy Here: e.g., Real-time syncing using Supabase's realtime features, or manual syncing on user actions].
* Conflict resolution strategy: [Describe how conflicts between local and remote data are handled].

**5. Error Handling:**

* [Describe how errors during local storage or Supabase interactions are handled, e.g., error logging, fallback mechanisms, user notifications].

**Data Structures:**

* [[DataTypes/Result Block|Result Block]]: Defines the structure of workout result data.
* [[DataTypes/Workout Data Structure|Workout Data Structure]]:  (Create this file to formally define the structure of data stored in the Data Store)
