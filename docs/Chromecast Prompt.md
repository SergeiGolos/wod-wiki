here is what i actually need to build for the chromecast to work correctly.. 

- new interface  IRutimeSubscription  with (chromecast and local) and update that support adding and removing subscriptions  (clicking the chromecast adds another subscripotsion)  disconnecting removes it..  other subcriptions could be created, the goal is to read the stack updates and output that are being raised in the runtime.
- a new event provider that similar to the subcription where there is a local version and a chromecast version (the chromecast version in both cases works as athe RPC channel moving alowing the UI and the Chromecast to process the same values.)
- new IRuntime implementation the ChromeCastPRC implementaion that runs on the chrome cast only and instead of doign actual engine processing is resposible for giving the chromecast workbench a proxy to the brower running the cast.

the work flow is like this

- IRuntimeScubscription[] is registered with the browser local only..
- chromecast button add the remote one once there is a channel astablished to send the messages.
  
  - local RuntiemScubscription binds to the current existing pipeline that update the workbench stored values and binds the shared state to the UI components.
  - on the chromecast, the chromecast workbench is loaded with a IRuntime that consumes the RPC message and send back the events (example next),
  - The chromecast workbook uses a localSubscription to buind to the same track panel used in the browser giving the same visual feel and funcationality

ending the casting session should unhook the chromecast subscripts in the browser and on the chromecast end the runtime session clearing the workbench state.
  
