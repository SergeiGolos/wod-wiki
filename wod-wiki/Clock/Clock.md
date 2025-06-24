
The clock consists of a couple of different levels of components

- Clock Container: This subscribes to the event stream of `CollectionSpan` notifications.
- A Clock Anchor: that is able to be added to the Clock container, with an Id of the CollectionSpan the clock is referencing.  It should be able to recieve updates around that ID from the clock container.  (on init we can regiseter and dispose the listner on dispose)
- A Metric Anchor which also subscribes to some CollectionSpan by Id and displays the Metric(s) data for that collection scan.
- A Label Anchor: that can be used to create targed text areas that can also be updated with CollectionSpan botifications.
  

### Container

The main point of the container is to represent a space in which the children of the control register the a context function for event notification based on the Id / name of the CollectionSpan target.  Some other space is going to generate different part of the applications is going to generate these events, but  the container needs to keep a hash table of the current state,  events with different target ids will come in over an observable and a hash table of the id to the CollectionSpans they carry will need to be updated, and the children that care about that id should be notified

When event comes with data, replace the data, when the event comes with undefined, clear the current data for that Id

when a new child subscribes, notificy the subscription right away with the current state.

### Anchors

These are child elements that expect to pull the registrion function  of the container context, they use the attribute name="" to identify the name/id of the CollectionSpan it targets.

We need 3 to start off, but others might follow so we should have some abstraction around repeating the effert of subscriotion and being notified of the state (hook???)

