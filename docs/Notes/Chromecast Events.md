Core Basic Event

- `type:string` carries the type of event, these values will be used as part of the stratagy pattern to fure out what event handler on the chromecast needs to do.
- `timestamp:Date` this will be the event time the message is sent, used to keep system in sync with the caster app
-  `bag:[string]=>object` the unique event handles should know how to handle casting the data from this type.
  
#### Events

- `set-display` which will be a generic state refresh, this will happen when ever a timer state is changed with segments: `TimeSpan[]` { start / stop? } times that account for the value that should be on the UI. metrics: Metric[] to build the lavel for the current work effort. 
- `set-sound` with a true / false in the `enabled` field in the bag.
- `set-debug` with a true and false value in the `enabled` field of the bag.
- `set-error`: propagate errors with `errorCode` and `message`- 
- `heartbeat`: periodic keep-alive messages to monitor connection health
- `set-idle` : simiarl to set-display but defines a custom waiting state when no clocks should be showing... 

A state object that is then shared with the <CastReciever> component.  In a later space, the same shared state object is going to be created with fake Chromecast message in storybook project.  so it will be important to abstract the chromecast sdk stuff away from events and the state objects that it will update

- Ensure `clientId` uniqueness and manage multiple concurrent clients if needed
- Guarantee event ordering; consider sequence numbers or acknowledgements
