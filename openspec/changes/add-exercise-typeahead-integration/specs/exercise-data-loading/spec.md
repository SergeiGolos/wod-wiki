# Spec: Exercise Data Loading

**Capability**: `exercise-data-loading`  
**Change**: `add-exercise-typeahead-integration`

## ADDED Requirements

### Requirement: Lazy Exercise Data Loading

Exercise data must be loaded on-demand from JSON files using paths from the exercise index, minimizing upfront memory usage.

#### Scenario: Load exercise data by path on first access
**Given** the exercise index contains a path to an exercise JSON file  
**When** full exercise data is requested for the first time  
**Then** the JSON file is loaded from the filesystem using the path  
**And** the file load operation completes within 200ms  
**And** the loaded data is parsed and returned

#### Scenario: Return cached data on subsequent access
**Given** exercise data has been loaded previously  
**When** the same exercise data is requested again  
**Then** the data is returned from cache  
**And** no file I/O operation is performed  
**And** the response time is < 1ms

#### Scenario: Load multiple exercises concurrently
**Given** multiple exercises need data loaded simultaneously  
**When** data loading is requested for 5 exercises at once  
**Then** file operations execute concurrently (not sequentially)  
**And** total load time is close to single file load time (< 300ms)  
**And** concurrent operations are limited to prevent resource exhaustion

### Requirement: LRU Cache Implementation

A Least Recently Used (LRU) cache must store exercise data to optimize repeated access patterns.

#### Scenario: Cache stores most recently used exercises
**Given** the LRU cache has a maximum size of 100 entries  
**When** an exercise is loaded and accessed  
**Then** the exercise data is stored in the cache  
**And** the access timestamp is recorded

#### Scenario: Evict least recently used entries when cache is full
**Given** the LRU cache contains 100 entries (at capacity)  
**When** a new exercise is loaded  
**Then** the least recently used entry is removed from the cache  
**And** the new exercise data is added to the cache  
**And** the cache size remains at 100 entries

#### Scenario: Update access order on cache hit
**Given** an exercise exists in the LRU cache  
**When** the exercise data is accessed  
**Then** the exercise is moved to the "most recently used" position  
**And** its access timestamp is updated  
**And** it becomes less likely to be evicted

#### Scenario: Cache operations are fast
**Given** the LRU cache is in use  
**When** cache get or set operations are performed  
**Then** operations complete in < 1ms  
**And** no significant performance overhead is introduced

### Requirement: File-Based Data Access

The system must reliably access exercise JSON files from the public exercises directory.

#### Scenario: Construct correct file path from index entry
**Given** an exercise index entry contains a relative path "Barbell_Squat"  
**When** full exercise data is requested  
**Then** the system constructs the path "public/exercises/Barbell_Squat/exercise.json"  
**And** the path is validated to prevent directory traversal  
**And** the file is loaded from the correct location

#### Scenario: Handle missing exercise files gracefully
**Given** an exercise index references a file that doesn't exist  
**When** data loading is attempted  
**Then** the load operation fails with a clear error  
**And** the error is logged to console  
**And** the suggestion system falls back to index metadata only  
**And** the editor remains functional

#### Scenario: Parse and validate exercise JSON structure
**Given** an exercise JSON file is loaded  
**When** the file content is parsed  
**Then** the JSON is validated against the Exercise interface  
**And** required fields (name, muscles, equipment, etc.) are verified  
**And** invalid or malformed data triggers an error  
**And** the error is handled gracefully

### Requirement: Asynchronous Loading

All data loading operations must be asynchronous to prevent blocking the UI thread.

#### Scenario: File loads do not block editor
**Given** the user is typing in the editor  
**When** exercise data is being loaded in the background  
**Then** the editor remains responsive  
**And** typing is not delayed or interrupted  
**And** file loading happens on a separate execution context

#### Scenario: Multiple async loads can occur simultaneously
**Given** user triggers suggestions that require loading 3 exercises  
**When** data loading begins for all 3 exercises  
**Then** all 3 loads execute concurrently  
**And** results are aggregated when all loads complete  
**And** partial results are not shown (all-or-nothing)

#### Scenario: Async load with timeout
**Given** an exercise data load operation is in progress  
**When** the operation takes longer than 500ms  
**Then** the operation is cancelled/timed out  
**And** an error is logged  
**And** cached or index-only data is used as fallback

### Requirement: Error Handling and Retry

The data loader must handle errors gracefully with automatic retry for transient failures.

#### Scenario: Retry failed load with exponential backoff
**Given** an exercise data load fails due to network error  
**When** the error is detected  
**Then** a retry is attempted after 1 second  
**And** if the retry fails, another retry occurs after 2 seconds  
**And** if all retries fail (max 3 attempts), the error is permanent  
**And** the exercise is marked as unavailable

#### Scenario: Don't retry for permanent errors
**Given** an exercise file returns 404 (not found)  
**When** the error is detected  
**Then** no retry is attempted  
**And** the exercise is immediately marked as unavailable  
**And** the error is logged once

#### Scenario: Graceful degradation on load failure
**Given** exercise data fails to load  
**When** the suggestion system needs to display the exercise  
**Then** basic metadata from the index is shown  
**And** a "(Details unavailable)" indicator is displayed  
**And** user can still select the exercise  
**And** hover documentation shows limited info

### Requirement: Data Loader Singleton

The exercise data loader must use a singleton pattern to share cache across all editor instances.

#### Scenario: Single loader instance across editor instances
**Given** multiple editor instances are active  
**When** any editor requests exercise data  
**Then** all editors share the same data loader instance  
**And** the LRU cache is shared across editors  
**And** loaded data is available to all editors

#### Scenario: Lazy initialization of singleton
**Given** the application starts with no active editors  
**When** the first editor is mounted  
**Then** the data loader singleton is created  
**And** initialization happens asynchronously  
**And** subsequent editors reuse the initialized loader

### Requirement: Cache Invalidation

The cache must support invalidation when exercise data is updated.

#### Scenario: Manual cache invalidation
**Given** the exercise data loader is active with cached entries  
**When** a cache clear operation is triggered  
**Then** all cached exercise data is removed  
**And** subsequent requests reload data from files  
**And** the cache size is reset to 0

#### Scenario: Cache entry invalidation by exercise
**Given** a specific exercise is cached  
**When** invalidation is requested for that exercise  
**Then** only that exercise's cache entry is removed  
**And** other cached exercises remain intact  
**And** the next request for that exercise reloads from file

### Requirement: Memory Efficiency

The data loading system must minimize memory usage through strategic caching.

#### Scenario: Index-only storage before data load
**Given** the exercise index is loaded  
**When** no exercise data has been accessed yet  
**Then** memory usage is minimal (only index data ~1.5MB)  
**And** no full exercise objects are in memory

#### Scenario: Bounded memory growth with cache limit
**Given** the user has searched for 200 different exercises  
**When** memory usage is measured  
**Then** only 100 exercises are cached (LRU limit)  
**And** total memory for cached data is < 20MB  
**And** older entries have been evicted automatically

#### Scenario: Cache size monitoring
**Given** the data loader is active  
**When** cache operations occur  
**Then** cache size is tracked and reported  
**And** cache hit rate is calculated  
**And** metrics are available for debugging and optimization

### Requirement: Data Loader API

The data loader must provide a clean, promise-based API for accessing exercise data.

#### Scenario: Load exercise by path
**Given** a valid exercise path from the index  
**When** `loadExercise(path)` is called  
**Then** a Promise is returned  
**And** the Promise resolves with exercise data  
**Or** the Promise rejects with an error if load fails

#### Scenario: Batch load multiple exercises
**Given** an array of exercise paths  
**When** `loadExercises(paths)` is called  
**Then** a Promise is returned  
**And** the Promise resolves with an array of exercise data  
**And** all loads execute concurrently  
**And** the result array matches the input order

#### Scenario: Check if exercise is cached
**Given** the data loader is active  
**When** `isCached(path)` is called  
**Then** a boolean is returned immediately (synchronous)  
**And** true indicates the exercise data is in cache  
**And** false indicates data would need to be loaded
