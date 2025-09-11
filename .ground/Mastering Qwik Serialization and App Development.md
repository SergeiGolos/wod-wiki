# Architecting Resumable Applications: A Comprehensive Technical Report on the Qwik Framework

## The Qwik Paradigm: A Fundamental Shift from Hydration to Resumability

The modern web development landscape has long been dominated by a
paradigm known as hydration. While effective in creating interactive
user experiences, this model carries inherent performance costs that
become increasingly burdensome as application complexity grows. Qwik
introduces a fundamentally different approach—resumability—designed from
the ground up to deliver instant-on web applications by eliminating the
hydration process entirely. Understanding this paradigm shift is the
first and most critical step in architecting applications with Qwik.

### Deconstructing Hydration: The "Execute Twice" Problem

Hydration is the process by which a server-rendered, static HTML page is
made interactive on the client-side. For a process to be considered
hydration, a pre-rendering step on the server, either through
Server-Side Rendering (SSR) or Static Site Generation (SSG), is a
prerequisite.<sup>2</sup> The core of the process involves the
client-side JavaScript framework re-executing the application's logic to
"rebuild" an in-memory representation of the component tree, attach
event listeners to the corresponding DOM nodes, and restore the
application state that was used on the server.<sup>1</sup>

This effectively means the application logic is executed twice: once on
the server to generate the initial HTML, and a second time on the client
to bring that HTML to life.<sup>2</sup> This re-execution is not a
trivial task. The framework must download all the component code
associated with the current page and execute their templates to
reconstruct the application's internal data structures, including
component boundaries and the reactivity graph. Even highly optimized
frameworks like SolidJS, which employ fine-grained reactivity, must
still execute component code on the client during hydration to build
their reactivity graph.<sup>2</sup>

The performance implications of this model are significant. The cost of
hydration is directly proportional to the complexity of the application;
as more components are added, the amount of JavaScript to download and
execute on the client increases, a phenomenon described as a "death by a
thousand cuts".<sup>2</sup> This directly and negatively impacts a
critical performance metric: Time To Interactive (TTI). While the user
may see the content quickly due to SSR (improving First Contentful
Paint), the application remains unresponsive until the hydration process
is complete.<sup>3</sup> Interactivity is fundamentally blocked by
hydration.<sup>2</sup> Furthermore, conventional optimization techniques
like code-splitting at component boundaries are often rendered
ineffective, as the framework is forced to eagerly download the code
anyway to recover the necessary information for
interactivity.<sup>2</sup>

### Introducing Resumability: Pause on the Server, Resume on the Client

Qwik's architecture is predicated on a novel concept called
resumability, which offers a faster alternative to
hydration.<sup>2</sup> Resumability is the ability for a framework to
pause execution on the server and resume it on the client without having
to re-download or re-execute the application's logic.<sup>1</sup> This
is achieved by serializing not only the application's state but also the
framework's own internal state—including the component tree,
relationships between state and components, and event listener
information—directly into the HTML during the server-rendering
process.<sup>1</sup>

A key enabler of this process is the **Qwikloader**, a minuscule
JavaScript snippet (approximately 1kb) that is inlined into the initial
HTML response.<sup>8</sup> Instead of attaching numerous individual
event listeners, the Qwikloader establishes a single, global event
listener on the document. When a user interacts with the page (e.g.,
clicks a button), this global listener intercepts the event. It then
inspects the DOM element that was the target of the interaction, looking
for special attributes like

on:click. This attribute contains all the information Qwik needs to
resume: a reference to the specific, lazy-loaded chunk of JavaScript
containing the event handler and the name of the function (symbol) to
execute within that chunk.<sup>1</sup> The framework then downloads only
that tiny piece of code and executes it. To avoid latency on the first
interaction, Qwik employs smart prefetching strategies, using a service
worker to eagerly load potential interaction code into the browser cache
without executing it.<sup>5</sup>

The fundamental mental model for a Qwik application is that it can be
serialized at any point in its lifecycle and seamlessly transferred to a
different virtual machine—from the server to the browser—where it simply
resumes execution from the exact point it was paused.<sup>1</sup> No
costly re-execution is required.

### The Qwik Optimizer: The Engine of Resumability

The magic of resumability is not a runtime phenomenon alone; it is made
possible by a critical build-time tool known as the **Qwik
Optimizer**.<sup>9</sup> The Optimizer is a Rollup/Vite plugin, written
in high-performance Rust and available as a WASM binary, that performs
sophisticated code transformations.<sup>9</sup> Its primary function is
to rearrange the developer-written code into a format that is inherently
lazy-loadable.

The central mechanism the Optimizer uses is the dollar sign (\$) suffix
or wrapper. This \$ acts as a special marker, a contract between the
developer and the framework, indicating a "serialization
boundary".<sup>8</sup> Whenever the Optimizer encounters a

\$, it performs a transformation: it extracts the function or closure
associated with the marker, converts it into an independently importable
symbol, and places it into its own JavaScript chunk.<sup>9</sup> This
applies to component definitions (

component\$), event handlers (onClick\$), lifecycle hooks (useTask\$),
and any arbitrary closure wrapped in the generic \$() function.

Consider a simple Counter component <sup>9</sup>:

> TypeScript

// Developer-written code  
export const Counter = component\$(() =\> {  
const count = useSignal(0);  
return \<button onClick\$={() =\>
count.value++}\>{count.value}\</button\>;  
});

The Optimizer transforms this single block of code into multiple,
interconnected pieces:

1.  The Main Chunk: The Counter constant is redefined to point to a Qwik
    Resource Locator (QRL), which is a serializable reference to the
    component's render function.  
    const Counter = component(qrl('./chunk-a.js', 'Counter_onMount'));

2.  chunk-a.js (Render Function): This file contains the JSX structure
    of the component. The onClick\$ handler is itself transformed into
    another QRL, pointing to a different chunk and capturing its lexical
    scope (the count signal).  
    export const Counter_onMount = () =\> {... return \<button
    onClick\$={qrl('./chunk-b.js', 'Counter_onClick',
    \[count\])}\>{count.value}\</button\>; };

3.  chunk-b.js (Event Handler): This tiny file contains only the logic
    for the click event.  
    const Counter_onClick = () =\> { const \[count\] =
    useLexicalScope(); return count.value++; };

This process of identifying boundaries with \$, extracting the code, and
creating serializable references (QRLs) is the core mechanism that
enables Qwik's fine-grained lazy loading and, by extension, its
resumable nature.

### Performance and SEO Implications of Resumability

The architectural choice of resumability over hydration has profound and
positive consequences for performance and Search Engine Optimization
(SEO). The causal chain is direct and powerful: resumability
necessitates the serialization of the entire framework state, which is
enabled by the Optimizer's aggressive, \$-driven code splitting. This
results in an initial JavaScript payload that is constant time, or O(1),
because it only contains the Qwikloader, regardless of the application's
size or complexity.<sup>11</sup> This, in turn, leads to a near-instant
Time To Interactive.

This architecture directly translates to exceptional Core Web Vitals
scores. By delivering pure, interactive HTML, Qwik excels at Largest
Contentful Paint (LCP) and virtually eliminates First Input Delay (FID),
often achieving perfect scores in tools like Google
Lighthouse.<sup>3</sup>

For SEO, the benefits are inherent and require no additional
configuration. Because Qwik applications are fully rendered on the
server and deliver complete HTML to the client, they are immediately
crawlable by search engine bots, ensuring maximum indexability
out-of-the-box.<sup>3</sup>

| Feature | Hydration (e.g., React, Vue) | Resumability (Qwik) | Performance Implication |
|----|----|----|----|
| **Initial JS Payload** | O(n) - Proportional to page complexity. Includes framework runtime and all component code for the current view. | O(1) - Constant size (~1kb Qwikloader), regardless of application complexity.<sup>11</sup> | Qwik maintains instant load times even for massive applications. |
| **Time To Interactive** | Blocked until all JS is downloaded, parsed, and executed to "hydrate" the DOM. | Instant. The page is interactive as soon as the HTML is rendered. JS is loaded on-demand post-interaction. | Qwik provides a vastly superior user experience, especially on slow networks or low-powered devices. |
| **Client-Side Workload** | High. The client must re-execute application logic to rebuild the component tree and attach listeners.<sup>2</sup> | Minimal. The client executes only the tiny Qwikloader and then the specific code for a given interaction. | Reduces CPU and memory usage on the client, freeing the main thread and improving responsiveness. |
| **State Restoration** | Application state is serialized as JSON and sent to the client, which then uses it during the re-execution process. | Application and framework state are serialized into the HTML, allowing the client to "resume" without re-execution.<sup>5</sup> | Qwik's approach is more efficient as it avoids the entire re-execution step. |
| **Event Listener Attachment** | Requires executing component code to discover where listeners should be attached. | A single global listener is used. Specific handlers are located via attributes in the HTML.<sup>8</sup> | Qwik's method requires no application code to be present on the client to handle events. |
| **Scalability** | Performance degrades as application size increases (the "death by a thousand cuts" problem).<sup>2</sup> | Performance remains constant regardless of application size or complexity. | Qwik is architecturally designed to scale to very large applications without performance degradation. |

## Core Primitives: The Building Blocks of a Qwik Application

With the foundational paradigm of resumability established, the focus
shifts to the practical building blocks developers use to construct Qwik
applications. These core primitives, while sharing syntactic
similarities with frameworks like React, are uniquely designed to
operate within Qwik's lazy-loaded, asynchronous, and serializable
architecture.

### The Component Model (component\$)

A Qwik component is a function that returns JSX, wrapped in the
component\$() API from @builder.io/qwik.<sup>12</sup> The trailing

\$ is a critical signal to the Qwik Optimizer, marking the component as
a lazy-loading boundary. This allows the Optimizer to automatically
break down the application, extracting each component into its own
fine-grained, lazy-loadable chunk.<sup>12</sup>

> TypeScript

import { component\$ } from '@builder.io/qwik';  
  
export const MyComponent = component\$(() =\> {  
return \<div\>Hello, Qwik!\</div\>;  
});

Qwik's JSX implementation intentionally prefers standard HTML
conventions over JavaScript-specific alternatives. For instance,
developers use the class attribute for CSS classes and for for label
associations, rather than React's className and htmlFor.<sup>13</sup>

A key architectural consequence of resumability is the decoupling of
parent and child components. Because all necessary props and state are
serialized directly into the HTML, a child component can be rendered,
updated, or become interactive without its parent component's code ever
being downloaded or executed on the client.<sup>1</sup> This enables a
level of out-of-order execution and lazy loading that is not possible in
traditional hydrating frameworks.

### Reactive State Management (useSignal and useStore)

Qwik's reactivity system is built upon the concept of signals. Unlike in
frameworks like React where state is conceptually tied to the component
instance that declares it, Qwik's state is inherently decoupled. A
signal or store can exist as a serializable entity in the application's
state graph before any component that subscribes to it has its code
downloaded to the client.<sup>1</sup>

useSignal(initialValue)

The useSignal() hook is the primary primitive for creating reactive
state for a single value, such as a string, number, or boolean. It
returns a Signal object with a .value property that is used for both
reading and writing the state.15 Any component or task that accesses

signal.value automatically creates a subscription, ensuring it will be
re-evaluated when the value changes.

> TypeScript

import { component\$, useSignal } from '@builder.io/qwik';  
  
export default component\$(() =\> {  
const count = useSignal(0);  
return (  
\<button onClick\$={() =\> count.value++}\>  
Count: {count.value}  
\</button\>  
);  
});

useStore(initialStateObject)

For managing more complex state, such as objects or arrays, Qwik
provides the useStore() hook. It creates a reactive proxy around an
object, providing deep reactivity by default. This means that mutations
to nested properties or elements within an array will automatically
trigger updates in subscribed components.15

> TypeScript

import { component\$, useStore } from '@builder.io/qwik';  
  
export default component\$(() =\> {  
const state = useStore({ user: { name: 'Alex' }, items: \['Apple'\]
});  
return (  
\<div\>  
\<p\>User: {state.user.name}\</p\>  
\<button onClick\$={() =\> state.items.push('Banana')}\>Add
Item\</button\>  
\</div\>  
);  
});

Because deep tracking requires allocating numerous Proxy objects, it can
introduce a performance overhead for very large, deeply nested state
objects. In such cases, developers can opt-out of deep tracking by
passing { deep: false } as a second argument to useStore(), limiting
reactivity to only the top-level properties of the object.<sup>15</sup>
A critical best practice is to avoid destructuring properties from a
store, as this breaks the reactive proxy connection.<sup>15</sup>

| Hook | Use Case | Reactivity Model | Performance Consideration | Example |
|----|----|----|----|----|
| **useSignal()** | Managing single, primitive values (string, number, boolean) or simple objects. | Tracks changes to the single .value property. | Highly efficient for simple state. | const count = useSignal(0); |
| **useStore()** | Managing complex objects or arrays with multiple properties. | Deeply reactive by default. Tracks mutations in nested objects and arrays. | Can be resource-intensive for large, deeply nested objects due to extensive Proxy allocation.<sup>15</sup> | const user = useStore({ name: 'Jane', address: { city: 'NY' } }); |
| **useStore({ deep: false })** | Managing complex objects where only top-level property changes need to be tracked. | Shallowly reactive. Only tracks changes to the immediate properties of the store object. | More performant for large state objects where deep reactivity is not required. | const data = useStore({ config: {...}, results: \[...\] }, { deep: false }); |

### Derived and Asynchronous State (useComputed\$ and useResource\$)

Qwik provides dedicated hooks for handling state that is derived from
other state or fetched asynchronously.

- **useComputed\$(() =\>...):** This is the preferred way to create
  synchronous derived values. The function passed to useComputed\$
  automatically tracks any signals it reads and re-executes whenever one
  of those dependencies changes. The result is a read-only
  signal.<sup>15</sup>  
  TypeScript  
  const firstName = useSignal('John');  
  const lastName = useSignal('Doe');  
  const fullName = useComputed\$(() =\> \`\${firstName.value}
  \${lastName.value}\`);  
  // fullName.value will be "John Doe" and update automatically

- **useResource\$(async ({ track }) =\>...):** This hook is designed for
  managing asynchronous operations, such as fetching data from an API.
  It receives a track function to explicitly register dependencies. The
  resource runs on the server during SSR and can re-run on the client
  when a tracked dependency changes. It manages the full lifecycle of
  the async operation (pending, resolved, rejected) and is intended to
  be used with the \<Resource /\> component, which declaratively handles
  rendering the different states.<sup>15</sup>

### Event Handling (onClick\$, etc.)

As established, the \$ suffix on event handlers like onClick\$ signifies
a lazy-loaded boundary.<sup>8</sup> This has important implications for
how events are handled.

Because the execution of an event handler can be delayed while its code
is downloaded from the network, traditional synchronous event APIs like
event.preventDefault() and event.stopPropagation() will not work as
expected inside the handler's closure.<sup>17</sup> Qwik solves this by
providing declarative attributes that are applied directly in the JSX:

> TypeScript

\<a href="/dangerous"  
preventdefault:click  
onClick\$={() =\> {  
// This code runs asynchronously, after the default navigation  
// has already been prevented by the attribute.  
console.log('Navigation was prevented declaratively.');  
}}\>  
Click me  
\</a\>

To promote code reuse, event handlers can be extracted into variables.
However, to make a standalone function serializable and usable as an
event handler, it must be explicitly wrapped in the \$() function. This
transforms it into a QRL that the Optimizer can process.<sup>17</sup>

> TypeScript

import { component\$, useSignal, \$ } from '@builder.io/qwik';  
  
export default component\$(() =\> {  
const count = useSignal(0);  
// The handler is wrapped in \$() to make it a reusable QRL  
const increment = \$(() =\> {  
count.value++;  
});  
return \<button onClick\$={increment}\>Count:
{count.value}\</button\>;  
});

### Component Lifecycle and Tasks (useTask\$, useVisibleTask\$)

Qwik provides task hooks for running side effects in response to state
changes, analogous to React's useEffect.

- **useTask\$(({ track }) =\>...):** This is an isomorphic hook, meaning
  it runs both on the server during SSR and can re-run on the client. It
  uses a track() function to subscribe to reactive state. It is the
  ideal place for effects that are safe to run in either
  environment.<sup>12</sup>

- **useVisibleTask\$(({ track }) =\>...):** This is a client-only hook
  that executes only after the component has been rendered in the
  browser. It is considered an "escape hatch" for interacting with
  browser-specific APIs (e.g., window, document, DOM measurements) or
  for integrating third-party libraries that expect a live
  DOM.<sup>12</sup> Its use should be minimized, as it forces eager
  execution of its code on the client, which can undermine the
  performance benefits of resumability. The framework's API design
  intentionally nudges developers towards more performant, lazy
  alternatives like  
  useOnDocument() for DOM events, reserving useVisibleTask\$ for cases
  where it is truly unavoidable.<sup>19</sup>

## The Serialization Boundary: A Deep Dive into the \$(...) Mechanism

The \$ marker is the cornerstone of Qwik's architecture, but it
introduces a strict set of rules governing what can and cannot be passed
between different parts of an application. This "serialization boundary"
is the point at which Qwik pauses execution and captures the necessary
context to resume later. Every piece of data that crosses this boundary
must be serializable. Understanding these rules is not merely a
technical detail; it is fundamental to architecting applications in Qwik
and is the most common source of errors for developers new to the
framework.

### Defining the Boundary: Where Serialization Occurs

A serialization boundary is created whenever the lexical scope of a
function is captured to be lazy-loaded. This process, which transforms a
function closure into a QRL, is triggered by any API that uses the \$
marker.<sup>20</sup>

Serialization boundaries are established in the following places:

- **Component Definitions:** component\$(() =\>...)

- **Event Handlers:** onClick\$={() =\>...}, onInput\$={() =\>...}, etc.

- **Hooks with QRLs:** useTask\$(() =\>...), useComputed\$(() =\>...),
  useResource\$(() =\>...), useVisibleTask\$(() =\>...)

- **Explicit QRL Creation:** \$(() =\>...) for creating reusable,
  serializable functions.

### Serialization Rules: What Can Be Captured?

When a function is extracted by the Optimizer at a \$ boundary, it may
need to access variables from its parent scope (i.e., it's a closure).
Qwik must be able to serialize these captured variables. The rules for
this are strict and explicit <sup>20</sup>:

1.  **Top-Level Exports:** Any variable, function, or class declared at
    the top level of a module and marked with export can be referenced
    from within a \$() boundary. The framework does not serialize the
    value itself but rather a reference to the module import. This works
    even if the exported value is not technically serializable, like a
    class definition or an unresolved promise.

2.  **const and Serializable Values:** A variable declared within a
    component's scope (but outside the \$() boundary) can only be
    captured if it meets two conditions simultaneously:

    - It must be declared with const. Capturing variables declared with
      let or var is not allowed, as their mutable nature is incompatible
      with serialization.

    - Its value must be of a type that Qwik knows how to serialize.

Attempting to capture a non-const variable or a const variable holding a
non-serializable value will pass static analysis but will result in a
runtime error when Qwik attempts to serialize the application
state.<sup>20</sup> This forces a "data first, logic second"
architectural pattern, where the developer must first consider how to
structure state in a serializable format before attaching lazy-loadable
logic to it.

### Serializable and Non-Serializable Types: An Exhaustive List

Qwik's serialization format is more powerful than standard
JSON.stringify, but it still has limitations.

**Types Serializable by Default:**

- **Primitives:** string, number, boolean, null, undefined.<sup>15</sup>

- **Plain Objects and Arrays:** Standard object literals ({}) and arrays
  (\`\`) are fully serializable.<sup>15</sup>

- **Built-in Classes:** Qwik has built-in support for serializing
  instances of Date, URL, Map, and Set.<sup>1</sup>

- **Resolved Promises:** Qwik's rendering engine is asynchronous. If it
  encounters a promise during rendering, it will await its resolution
  and then serialize the *resolved value*. The promise itself, in its
  pending state, is not serialized across a component's lexical
  scope.<sup>1</sup>

- **QRLs:** Any function wrapped in \$() is converted to a Qwik Resource
  Locator, which is a serializable object.<sup>1</sup>

- **DOM Element References:** References to DOM nodes (e.g., obtained
  via a ref signal) are serializable.<sup>1</sup>

- **Circular References:** Qwik's custom serializer can handle circular
  references within the state graph, a significant advantage over JSON,
  which only supports Directed Acyclic Graphs (DAGs).<sup>21</sup>

**Types That Are NOT Serializable:**

- **Custom Class Instances:** This is the most critical limitation.
  Instances of user-defined classes (new MyClass()) cannot be
  serialized. The process would lose the object's prototype chain,
  methods, and instanceof information.<sup>20</sup>

- **Functions and Closures:** Raw JavaScript functions that are not
  explicitly wrapped in \$() are not serializable.<sup>25</sup>

- **Streams:** Data streams and other resource handles cannot be
  serialized due to their dynamic and stateful nature.<sup>1</sup>

- **Complex Third-Party Objects:** Objects returned from libraries
  (e.g., an Axios response object) often contain methods, circular
  references, and other non-serializable properties that will cause
  errors.<sup>23</sup>

### Error Analysis and Mitigation Strategies

The most common error developers encounter is: Q-ERROR Error: Only
primitive and object literals can be serialized.<sup>23</sup> This
typically occurs when attempting to capture a custom class instance or a
complex object inside a

\$() boundary.

There are three primary strategies to mitigate this:

1.  **Data Transformation:** The most robust solution is to transform
    non-serializable data into a serializable format *before* it needs
    to cross a boundary. For example, instead of storing a full Axios
    response object in a store, extract only the necessary data into a
    plain object.  
    TypeScript  
    // Instead of this:  
    // state.response = await axios.get(...); // Fails serialization  
      
    // Do this:  
    const response = await axios.get(...);  
    state.data = response.data; // response.data is a plain object/array

2.  **Using noSerialize():** For state that is purely client-side and
    does not need to be preserved from the server, Qwik provides the
    noSerialize() utility. This function wraps a value and marks it to
    be ignored by the serializer. The value will be undefined on the
    client after resumption and must be re-initialized, typically within
    a useVisibleTask\$.<sup>27</sup> This represents a key architectural
    trade-off: you gain the ability to use complex client-side objects
    at the cost of losing resumability for that piece of state.

3.  **Confining to Client-Only Execution:** If the logic inherently
    depends on non-serializable objects (like a WebSocket connection or
    a complex library instance), the entire operation must be contained
    within a useVisibleTask\$, ensuring it only ever runs in the browser
    where serialization from the server is not a concern.<sup>21</sup>

### The QRL (Qwik Resource Locator): Serializing Functions

The mechanism Qwik uses to serialize a function reference is the QRL. A
QRL is a serializable array (a tuple) that contains all the information
needed to lazy-load and execute a function.<sup>17</sup> It typically
consists of:

1.  A string representing the path to the JavaScript chunk.

2.  A string for the exported symbol name within that chunk.

3.  (Optional) An array of lexically captured variables that have been
    serialized.

Example QRL: \].<sup>9</sup>

When the event is triggered on the client, the Qwikloader uses this QRL
to download ./chunk-xyz.js, find the MyComponent_onClick export, and
invoke it, passing in the deserialized captured variables. Inside the
lazy-loaded function, the useLexicalScope() hook is used to retrieve
these captured values.<sup>9</sup>

| Data Type | Serializable? | Conditions & Rules | Permissible Example (Code) | Impermissible Example (Code & Error) |
|----|----|----|----|----|
| **Primitives** | Yes | Always serializable. | const name = 'Qwik'; | N/A |
| **Plain Objects/Arrays** | Yes | Always serializable. | const data = { items: }; | N/A |
| **const vs. let** | const only | Captured variables must be const to be serializable. | const value = 10; \<button onClick\$={() =\> console.log(value)} /\> | let value = 10; \<button onClick\$={() =\> console.log(value)} /\> (Static analysis error) |
| **Custom Class Instances** | No | Prototype chain and methods are lost during serialization.<sup>20</sup> | N/A | class User {} const user = new User(); useStore({ user }); (Runtime serialization error) |
| **Functions** | QRLs only | Must be wrapped in \$() to be converted to a serializable QRL.<sup>25</sup> | const handler = \$(() =\> {}); \<button onClick\$={handler} /\> | const handler = () =\> {}; \<button onClick\$={handler} /\> (Serialization error) |
| **Promises** | Resolved Value | Qwik awaits and serializes the resolved value, not the pending promise.<sup>22</sup> | const data = useResource\$(() =\> Promise.resolve({ a: 1 })); | const promise = new Promise(...); useStore({ promise }); (Runtime serialization error) |
| **Date, Map, Set, URL** | Yes | Qwik has built-in support for these common object types.<sup>1</sup> | const store = useStore({ today: new Date() }); | N/A |
| **DOM References** | Yes | References to DOM elements can be stored in signals and serialized.<sup>1</sup> | const el = useSignal\<Element\>(); \<div ref={el} /\> | N/A |
| **Third-Party Objects** | No (Usually) | Complex objects with methods or circular references will fail.<sup>23</sup> | const data = (await axios.get(URL)).data; | const response = await axios.get(URL); (Runtime serialization error) |

## Qwik City: Architecting Full-Stack Applications

While Qwik Core provides the component and state management primitives,
**Qwik City** is the meta-framework built on top that provides the
necessary tools for building complete, production-grade applications. It
handles routing, server-side data fetching, server mutations, and API
endpoints, enabling a highly cohesive full-stack development
experience.<sup>28</sup>

### File-System Based Routing

Qwik City employs a file-system-based routing strategy, where the
structure of the src/routes/ directory directly maps to the
application's URL paths.<sup>29</sup>

- **Pages:** A file named index.tsx or index.mdx within a directory
  creates a new page route. For example, src/routes/about/index.tsx
  corresponds to the /about URL.<sup>29</sup>

- **Layouts:** A file named layout.tsx defines a layout component that
  wraps all child routes within that directory and its subdirectories.
  This is used for shared UI elements like headers and footers. Layouts
  use the \<Slot /\> component to render the child content.<sup>29</sup>

- **Dynamic Routes:** To create dynamic route segments, directory names
  are wrapped in square brackets, such as
  src/routes/products/\[productId\]/. The value of the productId
  parameter is then accessible in loaders and endpoints via the
  requestEvent.params object.<sup>32</sup>

- **Navigation:** Client-side navigation is handled primarily by the
  \<Link\> component, which provides an SPA-like experience without full
  page reloads. For programmatic navigation, the useNavigate() hook is
  available.<sup>29</sup>

### Server-Side Data Loading (routeLoader\$)

The primary mechanism for fetching data from a server (e.g., a database
or external API) is the routeLoader\$() function.<sup>34</sup>

- **Purpose and Execution:** A routeLoader\$ is defined and exported
  from a route file (index.tsx or layout.tsx). Its code executes
  exclusively on the server *before* any component rendering occurs for
  that route.<sup>34</sup> This ensures data is available when the HTML
  is generated.

- **Implementation and Data Access:** The routeLoader\$ returns a custom
  hook (e.g., useProductLoader). Any component within the application
  can call this hook to get access to the data. The hook returns a
  read-only signal containing the data fetched on the
  server.<sup>18</sup> This architecture creates a seamless data flow
  from server to client, abstracting away the complexities of network
  requests and state synchronization.  
  TypeScript  
  // src/routes/products/\[id\]/index.tsx  
  import { routeLoader\$ } from '@builder.io/qwik-city';  
  import { component\$ } from '@builder.io/qwik';  
  import { db } from '~/db';  
    
  export const useProductLoader = routeLoader\$(async (requestEvent) =\>
  {  
  const id = requestEvent.params.id;  
  return await db.getProductById(id);  
  });  
    
  export default component\$(() =\> {  
  const productSignal = useProductLoader();  
  return \<div\>{productSignal.value.name}\</div\>;  
  });

- **Error Handling:** Loaders can gracefully handle failures, such as a
  product not being found. By calling requestEvent.fail(404, { message:
  'Not Found' }), the loader can return a structured error object and
  set the appropriate HTTP status code. The component can then check for
  this failure state and render a corresponding UI.<sup>34</sup>

### Server-Side Mutations (routeAction\$, globalAction\$, server\$)

For handling operations that mutate data, Qwik City provides actions and
server\$ functions.

- **routeAction\$ and globalAction\$:** These are designed specifically
  for handling HTML form submissions and performing server-side side
  effects like creating, updating, or deleting data.<sup>35</sup> They
  are tightly integrated with the  
  \<Form\> component, which provides progressive enhancement: it
  functions as a standard HTML form if JavaScript is disabled but
  intercepts the request for an SPA experience when JS is
  available.<sup>18</sup>

  - **Scope:** routeAction\$ is scoped to the route file it's defined
    in, while globalAction\$ can be defined anywhere and used across the
    entire application, making it suitable for shared actions like login
    or logout.<sup>28</sup>

  - **Validation:** Actions can be paired with validators, most commonly
    zod\$(), to perform type-safe, server-side validation of the form
    data before the action's logic is executed.<sup>36</sup>

- **server\$:** This is a more generic Remote Procedure Call (RPC)
  mechanism. Unlike actions, it is not tied to form submissions. It
  allows any client-side code (e.g., an onClick\$ handler) to securely
  call a function that executes on the server and receive its return
  value.<sup>37</sup> This is ideal for interactions that don't fit the
  form submission model.

The cohesive design of these primitives creates a unified development
model. A developer can write a server-side database query inside a
routeLoader\$ and consume its data in a component within the same file.
The framework transparently handles the complex wiring of executing the
loader on the server, serializing its data, and hydrating it into a
reactive signal on the client.

### API Endpoints and Middleware

For scenarios requiring full control over the HTTP response, such as
building a traditional REST API, Qwik City provides low-level endpoint
handlers.

- **Endpoints:** By exporting functions named onGet, onPost, onPut,
  etc., from a route file, developers can create API endpoints. These
  functions receive the RequestEvent object and can send a response
  using methods like json() or send(), bypassing component rendering
  entirely.<sup>38</sup>

- **Middleware:** Middleware functions, also exported from route files,
  execute before any loaders or endpoints. They are ideal for
  implementing cross-cutting concerns like authentication checks,
  logging, or modifying request headers before the main request
  processing begins.<sup>28</sup>

| Function | Primary Use Case | Scope | How it's Triggered | Returns |
|----|----|----|----|----|
| **routeLoader\$** | Fetching data on the server before rendering a page. | Route-specific (index.tsx, layout.tsx). | On navigation to the associated route. | A use... hook that returns a read-only signal with the data. |
| **routeAction\$** | Handling form submissions with server-side mutations. | Route-specific (index.tsx, layout.tsx). | Submission of a \<Form\> component or programmatic action.submit(). | A use... hook that provides action status, return value, and form data. |
| **globalAction\$** | Handling form submissions shared across multiple routes. | Global (can be defined anywhere). | Submission of a \<Form\> component or programmatic action.submit(). | A use... hook that provides action status, return value, and form data. |
| **server\$** | General-purpose Remote Procedure Call (RPC) from client to server. | Global (can be defined anywhere). | Direct function call from client-side code (e.g., in an onClick\$). | A Promise that resolves with the server function's return value. |
| **onGet/onPost** | Creating low-level API endpoints (e.g., REST API). | Route-specific. | An HTTP request to the corresponding route URL and method. | A direct HTTP response (e.g., JSON, HTML, text). |

## Ecosystem, Tooling, and Deployment

Building a real-world application requires more than just a core
framework; it depends on a robust ecosystem of UI libraries, tooling for
integration, and clear pathways for deployment. While Qwik is a newer
framework, its ecosystem is rapidly maturing in a way that reinforces
its core performance-first philosophy.

### UI Component Libraries

The most popular UI libraries in the Qwik ecosystem are those that align
with its goal of minimizing the initial JavaScript payload.

- **Qwik UI:** The official UI library for Qwik, offering two distinct
  packages. The **Headless Kit** provides a set of completely unstyled,
  accessible (WAI-ARIA compliant), and resumable component primitives
  (e.g., Accordion, Tabs, ComboBox). This gives developers maximum
  control over styling. The **Styled Kit** is a pre-styled, "copy-paste"
  design system built on top of the headless components for faster
  development.<sup>39</sup>

- **Tailwind CSS-Based Libraries:** These are particularly popular
  because their utility-first or pure-CSS approach adds zero JavaScript
  overhead, perfectly preserving Qwik's performance benefits.

  - **daisyUI:** A highly popular component library for Tailwind CSS
    that works seamlessly with Qwik. As it is primarily CSS-based, it
    has no hydration cost and aligns with Qwik's fine-grained efficiency
    model.<sup>41</sup>

  - **Flowbite Qwik:** An official Flowbite component library for Qwik,
    providing a large collection of interactive UI components built with
    Qwik primitives and styled with Tailwind CSS.<sup>42</sup>

- **Qwik Bits:** A community-driven collection of accessible components
  and utility helpers for Qwik development.<sup>43</sup>

This trend towards CSS-centric libraries is not coincidental; it is a
direct reflection of the framework's philosophy. A UI library that ships
its own large JavaScript runtime would fundamentally conflict with
Qwik's core value proposition.

### Integrating with Other Frameworks (React)

Recognizing the vastness of the React ecosystem, the Qwik team provides
a pragmatic integration path via the @builder.io/qwik-react package.

- **qwikify\$():** This function allows developers to wrap an existing
  React component, making it usable within a Qwik application. It is
  primarily intended as a migration strategy or for leveraging complex
  React components, such as charting libraries, that do not have a
  native Qwik equivalent.<sup>44</sup>  
  TypeScript  
  /\*\* @jsxImportSource react \*/  
  import { qwikify\$ } from '@builder.io/qwik-react';  
  import { MaterialButton } from '@mui/material';  
    
  export const MUIButton = qwikify\$(MaterialButton);

- **Performance Trade-offs:** It is crucial to understand that qwikify\$
  is a pragmatic bridge, not a magic bullet. A qwikified React component
  is **not resumable**; it creates an "island of hydration" within the
  Qwik application that must be hydrated.<sup>45</sup> However, Qwik
  provides powerful control over  
  *when* this hydration cost is paid. The developer can specify a
  hydration strategy, such as on:visible (hydrate when the component
  scrolls into view), on:idle (hydrate when the browser main thread is
  idle), or on:click (hydrate only when the user interacts with it).
  This allows the performance penalty of hydration to be quarantined and
  deferred, preventing it from impacting the initial page
  load.<sup>45</sup>

### Deployment Strategies

Qwik City is designed to be deployed on a variety of modern hosting
platforms, particularly those that support edge computing. The
deployment process is streamlined through a system of **adapters**.

- **Adapters:** An adapter is a Vite configuration that customizes the
  build output to match the specific requirements of a target hosting
  environment (e.g., Vercel Edge Functions, Netlify Edge Functions, a
  Node.js server).<sup>46</sup> Adapters are easily added to a project
  via a single CLI command:  
  npm run qwik add \<adapter-name\>.

- **Build Process:** Running npm run build executes the build process,
  which typically generates two key directories: dist/ containing the
  static, client-side assets, and server/ containing the server-side
  rendering logic and middleware.<sup>47</sup>

- **Platform-Specific Guides:**

  - **Vercel Edge:** Run npm run qwik add vercel-edge. This configures
    the project to deploy to Vercel's global Edge Network. The project
    can then be deployed by connecting a Git repository to a Vercel
    project.<sup>48</sup>

  - **Netlify Edge:** Run npm run qwik add netlify-edge. This sets up
    the project for Netlify's Edge Functions. Deployment can be done via
    the Netlify CLI or by linking a Git repository in the Netlify
    dashboard.<sup>49</sup>

  - **Node.js (Self-Hosting):** Run npm run qwik add express. This
    generates an entry.express.js file, allowing the Qwik application to
    be served by a standard Node.js Express server.<sup>47</sup>

  - **AWS Lambda:** Run npm run qwik add aws-lambda. This adapter uses
    the Serverless Framework under the hood to package and deploy the
    application to AWS Lambda.<sup>50</sup>

- **Caching Best Practices:** For optimal performance, all assets
  generated in the dist/build/ directory have a content hash in their
  filename. These files are immutable and can be cached indefinitely by
  a CDN. It is a critical best practice to configure the web server or
  hosting platform to serve these files with the Cache-Control: public,
  max-age=31536000, immutable header.<sup>46</sup>

## Synthesis and Recommendations for Application Generation

Building applications with Qwik requires more than learning a new set of
APIs; it demands a shift in mental model. By synthesizing the
framework's core principles—resumability, serialization, and lazy
loading—we can derive a set of architectural patterns and strategic
recommendations that enable the generation of robust, scalable, and
maximally performant applications.

### Architectural Patterns for Scalable Qwik Apps

- **State Management Architecture:** For application-wide state, the
  recommended pattern is to leverage Qwik's built-in Context API. A
  global store, created with useStore(), can be provided at the root of
  the application (e.g., in src/routes/layout.tsx) and consumed by any
  child component via useContext().<sup>51</sup> This provides a clean,
  hierarchical way to manage state without resorting to prop-drilling.
  When designing state objects, their serializability should be the
  foremost consideration. Complex, non-serializable objects should be
  transformed into plain data structures before being placed in a store.

- **Unidirectional Data Flow:** A predictable and maintainable
  architecture in Qwik relies on a clear, unidirectional data flow.

  1.  **Server-to-Client:** Data should primarily flow from the server
      to the client via routeLoader\$(). This is the canonical way to
      load data for a given view.

  2.  **Client-to-Server:** Mutations and side effects should be sent
      from the client to the server via routeAction\$() (for forms) or
      server\$() (for RPC-style calls).

  3.  **UI Updates:** The server actions return new state, which Qwik's
      reactivity system then uses to automatically update the relevant
      components. This closed loop keeps the data lifecycle clear and
      aligned with the framework's design.

- **Granular Component Structure:** To fully leverage the power of the
  Qwik Optimizer, applications should be composed of small, focused
  components. Each component\$() is a potential code-splitting boundary.
  A larger number of small components gives the Optimizer more
  opportunities to create fine-grained chunks, ensuring that when a user
  interacts with a specific piece of the UI, only the absolute minimum
  amount of JavaScript is downloaded and executed.<sup>7</sup>

### A Mental Model for Resumable Development

- **Think "Serializable First":** The most significant paradigm shift
  required by Qwik is to move from a logic-centric to a data-centric
  mindset. Before writing any component or event handler, the primary
  architectural question must be: "What is the state, and how can I
  represent it in a serializable format?" All application logic is
  ultimately an attachment to this serializable state graph. This "great
  filter" of serialization forces a discipline that leads directly to
  resumable, performant applications.

- **Embrace Asynchronicity:** In Qwik, everything from component
  rendering to event handling is fundamentally asynchronous. Developers
  must unlearn the habit of relying on synchronous APIs for tasks like
  preventing default event behaviors or accessing DOM properties
  immediately after a state change. The framework provides
  asynchronous-first solutions for these problems (e.g., declarative
  attributes, useTask\$), and embracing them is key to working with the
  grain of the framework, not against it.

- **Trust the Optimizer:** The developer's role is not to manually
  manage code splitting or lazy loading. Their responsibility is to
  provide clear signals to the build-time Optimizer by using the \$
  marker correctly and adhering to the serialization contract. By doing
  so, they can trust that the Optimizer will perform the complex
  transformations required to produce a highly optimized, resumable
  application.

### Strategic Decision-Making: When to Choose Qwik

Qwik is not a universal replacement for all other web frameworks, but
rather a specialized tool that offers unparalleled advantages for a
specific class of applications.

**Ideal Use Cases:**

- **Performance-Critical Websites:** Qwik is the premier choice for
  applications where initial load performance and Core Web Vitals are
  non-negotiable business requirements. This includes e-commerce
  platforms (where speed directly impacts conversion rates),
  content-heavy sites like blogs and news portals, and marketing landing
  pages.<sup>3</sup>

- **SEO-Focused Applications:** Due to its SSR-first architecture that
  delivers pure, crawlable HTML, Qwik provides best-in-class SEO
  performance out-of-the-box.<sup>3</sup>

- **Micro-Frontends (MFEs):** Qwik's ability to lazy-load and resume
  independent components makes it an excellent architectural fit for MFE
  implementations. Each micro-frontend can be a self-contained Qwik
  application that loads instantly and interacts seamlessly without the
  overhead of a monolithic bootstrap process.<sup>7</sup>

**Considerations and Trade-offs:**

- **Learning Curve:** The primary investment when adopting Qwik is
  learning its unique mental model. The concepts of resumability and the
  strict rules of serialization require a departure from the patterns
  established by hydrating frameworks like React or Vue.<sup>52</sup>

- **Ecosystem Maturity:** While growing rapidly, Qwik's ecosystem of
  third-party libraries and tools is less mature than that of
  established players like React. Projects that depend heavily on a wide
  array of specific React libraries may find that using qwikify\$
  introduces a necessary but suboptimal layer of hydration
  complexity.<sup>3</sup>

In conclusion, Qwik represents a forward-looking vision for web
development, offering a solution to the long-standing problem of
client-side performance bottlenecks. By providing the necessary context
and architectural patterns, developers can leverage its innovative
resumability model to generate a new class of web applications that are,
by default, instantly interactive and scalable to any level of
complexity.

#### Works cited

1.  Resumable \| Concepts Qwik Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/concepts/resumable/</u>](https://qwik.dev/docs/concepts/resumable/)

2.  Resumability vs Hydration - Builder.io, accessed August 21, 2025,
    [<u>https://www.builder.io/blog/resumability-vs-hydration</u>](https://www.builder.io/blog/resumability-vs-hydration)

3.  Qwik vs React: A Detailed Comparison for Modern Web Development -
    DhiWise, accessed August 21, 2025,
    [<u>https://www.dhiwise.com/post/qwik-vs-react</u>](https://www.dhiwise.com/post/qwik-vs-react)

4.  Why Qwik May Replace React in Web Development? - Seven Square,
    accessed August 21, 2025,
    [<u>https://www.sevensquaretech.com/qwik-vs-react-framework-fastest-web-framework/</u>](https://www.sevensquaretech.com/qwik-vs-react-framework-fastest-web-framework/)

5.  Qwik: The Framework King - Telerik.com, accessed August 21, 2025,
    [<u>https://www.telerik.com/blogs/qwik-framework-king</u>](https://www.telerik.com/blogs/qwik-framework-king)

6.  Resumability as temporary layout store : r/qwik - Reddit, accessed
    August 21, 2025,
    [<u>https://www.reddit.com/r/qwik/comments/1166vup/resumability_as_temporary_layout_store/</u>](https://www.reddit.com/r/qwik/comments/1166vup/resumability_as_temporary_layout_store/)

7.  Resumability Unleashed: How Qwik Redefines High-Performance Web
    Apps - Medium, accessed August 21, 2025,
    [<u>https://medium.com/@nagendramirajkar/resumability-unleashed-how-qwik-redefines-high-performance-web-apps-edc8baba3089</u>](https://medium.com/@nagendramirajkar/resumability-unleashed-how-qwik-redefines-high-performance-web-apps-edc8baba3089)

8.  Event Listeners \| Tutorial Qwik Documentation, accessed August 21,
    2025,
    [<u>https://qwik.dev/tutorial/events/basic/</u>](https://qwik.dev/tutorial/events/basic/)

9.  Optimizer Rules \| Advanced Qwik Documentation, accessed August 21,
    2025,
    [<u>https://qwik.dev/docs/advanced/optimizer/</u>](https://qwik.dev/docs/advanced/optimizer/)

10. QwikDev/qwik: Instant-loading web apps, without effort - GitHub,
    accessed August 21, 2025,
    [<u>https://github.com/QwikDev/qwik</u>](https://github.com/QwikDev/qwik)

11. Frequently Asked Questions \| Introduction Qwik Documentation,
    accessed August 21, 2025,
    [<u>https://qwik.dev/docs/faq/</u>](https://qwik.dev/docs/faq/)

12. Overview \| Components Qwik Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/components/overview/</u>](https://qwik.dev/docs/components/overview/)

13. Rendering \| Components Qwik Documentation, accessed August 21,
    2025,
    [<u>https://qwik.dev/docs/components/rendering/</u>](https://qwik.dev/docs/components/rendering/)

14. Towards Qwik 2.0: Lighter, Faster, Better - Builder.io, accessed
    August 21, 2025,
    [<u>https://www.builder.io/blog/qwik-2-coming-soon</u>](https://www.builder.io/blog/qwik-2-coming-soon)

15. State \| Components Qwik Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/components/state/</u>](https://qwik.dev/docs/components/state/)

16. Qwik Store \| CodeHints, accessed August 21, 2025,
    [<u>https://codehints.io/qwik/store</u>](https://codehints.io/qwik/store)

17. Events \| Components Qwik Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/components/events/</u>](https://qwik.dev/docs/components/events/)

18. Getting Started \| Introduction Qwik Documentation, accessed August
    21, 2025,
    [<u>https://qwik.dev/docs/getting-started/</u>](https://qwik.dev/docs/getting-started/)

19. Best Practices \| Guides Qwik Documentation, accessed August 21,
    2025,
    [<u>https://qwik.dev/docs/guides/best-practices/</u>](https://qwik.dev/docs/guides/best-practices/)

20. Serialization and Serialization Boundaries \| Guides Qwik
    Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/guides/serialization/</u>](https://qwik.dev/docs/guides/serialization/)

21. Practical guide: build a quiz application with Qwik framework -
    Bejamas, accessed August 21, 2025,
    [<u>https://bejamas.com/hub/tutorials/build-a-quiz-application-with-qwik-framework</u>](https://bejamas.com/hub/tutorials/build-a-quiz-application-with-qwik-framework)

22. Is Qwik + RxJS actually possible? - DEV Community, accessed August
    21, 2025,
    [<u>https://dev.to/mfp22/is-qwik-rxjs-actually-possible-5hk3</u>](https://dev.to/mfp22/is-qwik-rxjs-actually-possible-5hk3)

23. \[DOCS\]: explain "Only primitive and object literals can be
    serialized." · Issue \#417 - GitHub, accessed August 21, 2025,
    [<u>https://github.com/BuilderIO/qwik/issues/417</u>](https://github.com/BuilderIO/qwik/issues/417)

24. I found a way to serialize class objects, would be nice if you guys
    would like to implement this. · Issue \#2083 · QwikDev/qwik -
    GitHub, accessed August 21, 2025,
    [<u>https://github.com/BuilderIO/qwik/issues/2083</u>](https://github.com/BuilderIO/qwik/issues/2083)

25. Handling onClick\$ in Qwik with Functions Passed as Props - Stack
    Overflow, accessed August 21, 2025,
    [<u>https://stackoverflow.com/questions/79330737/handling-onclick-in-qwik-with-functions-passed-as-props</u>](https://stackoverflow.com/questions/79330737/handling-onclick-in-qwik-with-functions-passed-as-props)

26. Qwik JS error - Only primitive and object literals can be
    serialized - Stack Overflow, accessed August 21, 2025,
    [<u>https://stackoverflow.com/questions/76889650/qwik-js-error-only-primitive-and-object-literals-can-be-serialized</u>](https://stackoverflow.com/questions/76889650/qwik-js-error-only-primitive-and-object-literals-can-be-serialized)

27. How can I create a non-serializable function in QWIK that avoids
    automatic serialization?, accessed August 21, 2025,
    [<u>https://stackoverflow.com/questions/76996205/how-can-i-create-a-non-serializable-function-in-qwik-that-avoids-automatic-seria</u>](https://stackoverflow.com/questions/76996205/how-can-i-create-a-non-serializable-function-in-qwik-that-avoids-automatic-seria)

28. Overview \| Qwik City Qwik Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/qwikcity/</u>](https://qwik.dev/docs/qwikcity/)

29. Routing \| Qwik City Qwik Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/routing/</u>](https://qwik.dev/docs/routing/)

30. Chapter 1: Getting Started - Learn Qwik, accessed August 21, 2025,
    [<u>https://www.learn-qwik.com/learn/dashboard-app/getting-started/</u>](https://www.learn-qwik.com/learn/dashboard-app/getting-started/)

31. Creating a Personal Blog Website with Qwik - eldss, accessed August
    21, 2025,
    [<u>https://eldss.dev/blog/creating-a-blog-with-qwik/</u>](https://eldss.dev/blog/creating-a-blog-with-qwik/)

32. Using a QwikCity Loader to Load Database Data \| by Gil Fink -
    Medium, accessed August 21, 2025,
    [<u>https://gilfink.medium.com/using-a-qwikcity-loader-to-load-database-data-b016f0dcf6d2</u>](https://gilfink.medium.com/using-a-qwikcity-loader-to-load-database-data-b016f0dcf6d2)

33. Chapter 11: Mutating Data - Learn Qwik, accessed August 21, 2025,
    [<u>https://www.learn-qwik.com/learn/dashboard-app/mutating-data/</u>](https://www.learn-qwik.com/learn/dashboard-app/mutating-data/)

34. RouteLoader\$ \| Qwik City Qwik Documentation, accessed August 21,
    2025,
    [<u>https://qwik.dev/docs/route-loader/</u>](https://qwik.dev/docs/route-loader/)

35. Introduction to Qwik and the Power of Loaders and Actions - Tech
    Blog - SparkFabrik, accessed August 21, 2025,
    [<u>https://tech.sparkfabrik.com/en/blog/qwik-and-the-power-of-loaders-and-actions/</u>](https://tech.sparkfabrik.com/en/blog/qwik-and-the-power-of-loaders-and-actions/)

36. RouteAction\$ \| QwikCity Qwik Documentation, accessed August 21,
    2025,
    [<u>https://qwik.dev/docs/action/</u>](https://qwik.dev/docs/action/)

37. How to add a record to a database using Qwik and Prisma? - Stack
    Overflow, accessed August 21, 2025,
    [<u>https://stackoverflow.com/questions/76084662/how-to-add-a-record-to-a-database-using-qwik-and-prisma</u>](https://stackoverflow.com/questions/76084662/how-to-add-a-record-to-a-database-using-qwik-and-prisma)

38. Endpoints \| Qwik City Qwik Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/endpoints/</u>](https://qwik.dev/docs/endpoints/)

39. Qwik UI - The world's fastest loading UI components library,
    accessed August 21, 2025,
    [<u>https://qwikui.com/</u>](https://qwikui.com/)

40. qwikifiers/qwik-ui: Qwik's Headless and styled component library -
    GitHub, accessed August 21, 2025,
    [<u>https://github.com/qwikifiers/qwik-ui</u>](https://github.com/qwikifiers/qwik-ui)

41. Qwik component library — Tailwind CSS Components ( version 5 update
    is here ) - daisyUI, accessed August 21, 2025,
    [<u>https://daisyui.com/qwik-component-library/</u>](https://daisyui.com/qwik-component-library/)

42. Flowbite Qwik - UI Component Library, accessed August 21, 2025,
    [<u>https://flowbite-qwik.com/</u>](https://flowbite-qwik.com/)

43. Qwik Bits, accessed August 21, 2025,
    [<u>https://qwikbits.dev/</u>](https://qwikbits.dev/)

44. How to use React components in Qwik? - Stack Overflow, accessed
    August 21, 2025,
    [<u>https://stackoverflow.com/questions/75685318/how-to-use-react-components-in-qwik</u>](https://stackoverflow.com/questions/75685318/how-to-use-react-components-in-qwik)

45. Qwik vs. Next.js: Which framework is right for your next web ... -
    Outshift, accessed August 21, 2025,
    [<u>https://outshift.cisco.com/blog/qwik-vs-nextjs</u>](https://outshift.cisco.com/blog/qwik-vs-nextjs)

46. Deployments \| Guides Qwik Documentation, accessed August 21, 2025,
    [<u>https://qwik.dev/docs/deployments/</u>](https://qwik.dev/docs/deployments/)

47. Deploy Qwik Project - Zeabur, accessed August 21, 2025,
    [<u>https://zeabur.com/docs/en-US/guides/nodejs/qwik</u>](https://zeabur.com/docs/en-US/guides/nodejs/qwik)

48. Vercel Edge Adapter and Middleware \| Deployments Qwik ..., accessed
    August 21, 2025,
    [<u>https://qwik.dev/docs/deployments/vercel-edge/</u>](https://qwik.dev/docs/deployments/vercel-edge/)

49. How to Deploy the Qwik JavaScript Framework \| Netlify, accessed
    August 21, 2025,
    [<u>https://www.netlify.com/blog/how-to-deploy-the-qwik-javascript-framework/</u>](https://www.netlify.com/blog/how-to-deploy-the-qwik-javascript-framework/)

50. AWS Lambda \| Deployments Qwik Documentation, accessed August 21,
    2025,
    [<u>https://qwik.dev/docs/deployments/aws-lambda/</u>](https://qwik.dev/docs/deployments/aws-lambda/)

51. qwik - Is there any way to define state, non-bound to the
    componenttree - like svelte/store, accessed August 21, 2025,
    [<u>https://stackoverflow.com/questions/77379341/is-there-any-way-to-define-state-non-bound-to-the-componenttree-like-svelte-s</u>](https://stackoverflow.com/questions/77379341/is-there-any-way-to-define-state-non-bound-to-the-componenttree-like-svelte-s)

52. Modern JavaScript Frameworks Compared: Svelte, Qwik, React, and
    SolidJS - Medium, accessed August 21, 2025,
    [<u>https://medium.com/@rajamails19/modern-javascript-frameworks-compared-svelte-qwik-react-and-solidjs-967face904f1</u>](https://medium.com/@rajamails19/modern-javascript-frameworks-compared-svelte-qwik-react-and-solidjs-967face904f1)
