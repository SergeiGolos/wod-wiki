# Architectural Inversion: A Deep Dive into the Dependency Inversion Principle

## Introduction: The Inversion of Thought: Deconstructing the Dependency Inversion Principle

The Dependency Inversion Principle (DIP) stands as the capstone of the
five SOLID principles of object-oriented design, a set of guidelines
introduced by Robert C. Martin to foster more comprehensible, flexible,
and maintainable software architectures.<sup>1</sup> While its
counterparts—the Single Responsibility Principle (SRP), Open/Closed
Principle (OCP), Liskov Substitution Principle (LSP), and Interface
Segregation Principle (ISP)—primarily guide the internal design of
classes and their immediate inheritance hierarchies, the Dependency
Inversion Principle transcends this scope. It governs the macroscopic
structure of an application, dictating the dependency flow between
entire modules and layers, thereby shaping the very skeleton of the
software architecture.<sup>2</sup>

The central thesis of this report is that DIP represents not merely a
coding pattern or a technical rule, but a fundamental and profound shift
in architectural thinking. It challenges the conventional, top-down flow
of dependencies where high-level business logic is built upon and
coupled to low-level implementation details. Instead, it mandates a
strategic reversal of these dependencies. This inversion serves a
critical purpose: to shield the high-value, conceptually stable business
policies of a system from the inherent volatility and transience of
low-level mechanisms, such as databases, web frameworks, or third-party
APIs.<sup>4</sup> By doing so, it allows the core of the software—the
part that embodies the business's unique value—to endure and evolve
independently of the technological churn that characterizes the
infrastructure layer.<sup>5</sup>

A comprehensive analysis of the Dependency Inversion Principle is
immediately confronted by a pervasive and persistent source of
confusion: its common conflation with the related, yet distinct,
concepts of Dependency Injection (DI) and Inversion of Control
(IoC).<sup>7</sup> This terminological ambiguity has clouded the
understanding of many developers, leading to misapplication of the
principle and a failure to realize its full architectural benefits. A
primary objective of this report is to rigorously dissect and clarify
these concepts, drawing upon the seminal work of figures like Martin
Fowler to establish a precise and unambiguous conceptual
framework.<sup>10</sup>

This report will embark on an exhaustive exploration of the Dependency
Inversion Principle. It will begin by establishing the foundational
tenets of the principle, moving beyond rote recitation to a deep
analysis of its constituent rules and the critical concepts of policy,
detail, and abstraction. Subsequently, it will articulate the strategic
architectural benefits that arise from adherence to DIP, including
enhanced modularity, maintainability, testability, and scalability. The
report will then ground these theoretical discussions in practice
through a series of detailed code examples across multiple programming
languages, demonstrating the transformation from a tightly-coupled to a
loosely-coupled design. A dedicated section will demystify the
relationship between DIP, DI, and IoC. Following this, the analysis will
situate DIP within the broader SOLID framework, examining its
synergistic interplay with the other four principles. Finally, the
report will adopt a critical and pragmatic perspective, exploring the
pitfalls of over-abstraction and providing guidelines for the judicious
application of, and deviation from, the principle in real-world
scenarios.

## I. Foundational Tenets of Dependency Inversion

To fully grasp the architectural implications of the Dependency
Inversion Principle, it is essential to move beyond a surface-level
understanding of its definition. This section deconstructs the principle
into its core components, analyzing the precise meaning of its rules and
the roles of the architectural elements involved.

### A. The Formal Definition

The Dependency Inversion Principle, as codified by Robert C. Martin, is
articulated through two canonical rules that are consistently cited
across software engineering literature <sup>1</sup>:

1.  *High-level modules should not depend on low-level modules. Both
    should depend on abstractions.*

2.  *Abstractions should not depend on details. Details (concrete
    implementations) should depend on abstractions.*

The language of these rules is deliberate. The term "depend" refers
specifically to source code dependencies, such as import, using, or
include statements, which create a compile-time relationship between
software components.<sup>4</sup> The phrasing "should not" establishes a
strong architectural guideline rather than an immutable law,
acknowledging that pragmatic exceptions exist, which will be explored
later in this report. At its heart, the principle dictates that the
interaction between different layers of a system should be mediated by
abstract contracts, ensuring that neither layer is directly aware of the
concrete implementation of the other.<sup>4</sup>

### B. High-Level Policies vs. Low-Level Details

The distinction between "high-level modules" and "low-level modules" is
central to the principle's rationale. This distinction is not about
position in a call stack but about the level of abstraction and
proximity to the core purpose of the application.

**High-level modules** are the components that encapsulate the essential
business logic, policies, and abstract workflows of the
application.<sup>14</sup> They represent the "important things" that
define

*what* the system does and embody the rules of the business
domain.<sup>1</sup> For example, in an e-commerce system, the modules
that handle order processing, pricing calculations, and inventory
management are high-level. These policies are, in theory, the most
stable part of the system; the fundamental rules of how the business
operates change far less frequently than the technology used to
implement them.<sup>15</sup>

**Low-level modules**, in contrast, are the components that handle the
implementation details and mechanisms required to execute the high-level
policies.<sup>14</sup> They define

*how* the system accomplishes its tasks. This includes interacting with
a database, sending an email, making an API call to a payment gateway,
or writing to the file system.<sup>3</sup> These modules are inherently
more volatile. The choice of database might change from MySQL to
PostgreSQL, the email provider might be swapped, or a new payment
processor might be added. DIP is designed to ensure that these changes,
which are common throughout the lifecycle of a project, do not impact
the stable, high-level business logic.<sup>14</sup>

An effective analogy is the relationship between an architect's
blueprint for a house and the specific tools used by the construction
crew. The blueprint represents the high-level policy—it defines the
structure, layout, and function of the house. The specific brands of
saws, hammers, and drills used to build it are the low-level details.
The blueprint should never depend on the brand of hammer; rather, any
brand of hammer that meets the abstract requirement of "a tool for
driving nails" should be usable.

### C. The Role of Abstractions

Abstractions are the linchpin of the Dependency Inversion Principle.
They are the mechanism through which the decoupling of high-level and
low-level modules is achieved.<sup>1</sup> In most object-oriented
languages, these abstractions take the form of interfaces or abstract
classes. They act as a contract, defining a set of methods and
properties that a high-level module requires to perform its function,
without specifying

*how* that function is implemented.<sup>1</sup> This creates a stable
boundary, analogous to an electrical socket, which allows any compliant
appliance (a low-level detail) to be plugged into the building's wiring
(the high-level policy).<sup>17</sup>

The choice between an interface and an abstract class is a crucial
design decision. An **interface** contains only method signatures
without any implementation, forcing any class that implements it to
provide its own logic for every method. This promotes the weakest
possible coupling and the greatest flexibility.<sup>1</sup> An

**abstract class**, on the other hand, can provide some default, shared
behavior in addition to defining abstract methods that must be
implemented by subclasses. This can be useful for reducing code
duplication but also introduces a tighter form of coupling through
inheritance, which must be carefully considered.<sup>1</sup>

Crucially, the abstraction should be designed from the perspective of
the client (the high-level module). It should model the abstract
*interaction* between the modules, defining the services the high-level
module needs in the language of the business domain, not exposing the
capabilities of a specific low-level tool.<sup>4</sup> For instance, an
interface for a data persistence module should have methods like

save(User user) or findUserById(string id), not executeSQL(string
query).

### D. The True Meaning of "Inversion"

The name "Dependency Inversion Principle" can be misleading if taken too
literally. It does not typically mean a simple reversal of a dependency
arrow from A→B to B→A. Instead, it involves introducing a third
element—the abstraction (I)—and making both the high-level module (A)
and the low-level module (B) depend on it. The true "inversion"
manifests in two critical ways: the inversion of dependency direction
relative to the flow of control, and, most importantly, the inversion of
interface ownership.

In a traditional, non-DIP architecture, the dependency arrows follow the
flow of control. A high-level OrderProcessingService would directly call
and thus have a source code dependency on a low-level
MySqlRepository.<sup>4</sup> The dependency points downwards, from
policy to detail. When DIP is applied, an

IOrderRepository interface is introduced. The OrderProcessingService
depends on this interface. The MySqlRepository also depends on this
interface by implementing it. The flow of control at runtime still goes
from the service to the repository, but the source code dependency of
the high-level service is now on the abstraction, not the concrete
detail.<sup>15</sup>

The more profound inversion, and the one most critical to achieving
architectural resilience, is the **inversion of interface ownership**.
In a robust, DIP-compliant architecture, the abstraction (the interface)
is not owned by the low-level layer; it is owned by and resides within
the package or layer of the high-level module that uses it.<sup>4</sup>
The

IOrderRepository interface belongs with the OrderProcessingService in
the core business logic layer. The low-level MySqlRepository, which
resides in an infrastructure layer, must then reference the business
logic layer in order to implement the interface. This inverts the
conventional architectural dependency, where the application core
depends on infrastructure. Now, the infrastructure details depend on the
policies defined by the core.<sup>4</sup>

This inversion of ownership is the key to protecting the high-level
code. It establishes the application's core business logic as the
central, independent component of the system. The low-level details—the
database, the message queue, the web framework—become plugins that must
conform to the contracts defined by the core. This architectural stance
is the foundational concept behind modern architectural patterns like
Clean Architecture and Hexagonal (Ports and Adapters) Architecture,
where DIP is not just a guideline but the central organizing
principle.<sup>5</sup> The "ports" in a hexagonal architecture are
precisely these high-level, client-owned interfaces, and the "adapters"
are the low-level implementations that plug into them.

## II. The Architectural Imperative: Strategic Benefits of Adherence to DIP

Adhering to the Dependency Inversion Principle is not an academic
exercise; it is an architectural strategy that yields significant,
tangible improvements to the quality, longevity, and cost-effectiveness
of a software system. The benefits are not isolated but form a virtuous
cycle, where improvements in one area reinforce and enable improvements
in others. Fundamentally, DIP is a powerful tool for managing the
primary risk in software development: the cost and complexity of change.

### A. Achieving True Decoupling and Modularity

The most immediate outcome of applying DIP is the achievement of genuine
loose coupling between software modules.<sup>1</sup> In a tightly
coupled system, a change to a low-level component, such as altering the
schema of a database table or fixing a bug in a payment gateway's API
client, often necessitates corresponding changes in the high-level
business logic that consumes it. This creates a fragile architecture
where changes have a wide and often unpredictable "ripple
effect".<sup>5</sup>

DIP breaks these rigid connections. By inserting an abstraction between
the high-level policy and the low-level detail, it ensures that the
high-level module is completely insulated from the implementation
specifics of the low-level module. As long as the contract defined by
the abstraction remains stable, the underlying implementation can be
modified, fixed, or even completely replaced without requiring any
changes—or even recompilation—of the high-level modules.<sup>15</sup>
This fosters true modularity, where components can be developed, tested,
deployed, and versioned independently, a critical requirement for
large-scale applications, distributed teams, and microservice-based
architectures.<sup>15</sup>

### B. Enhancing System Maintainability and Flexibility

This decoupling directly translates into a more maintainable and
flexible system. The core business logic, which depends only on stable
abstractions, becomes highly resilient to change.<sup>6</sup> Concrete
classes and implementation details are, by their nature, the most
volatile parts of a system; abstractions and interfaces, which model
fundamental interactions, change much less frequently.<sup>15</sup> By
depending on the latter, the system's architecture becomes more durable.

This architectural flexibility is most evident when components need to
be swapped or extended. For instance, a business application might
initially launch using a local file system for storage. A high-level
DocumentService would depend on an IDocumentStorage interface. The
initial low-level implementation would be a FileSystemStorage class.
Later, as the application grows, a new requirement might emerge to store
documents in a cloud service like Amazon S3. With a DIP-compliant
design, this becomes a straightforward task. A new S3Storage class is
created that implements the existing IDocumentStorage interface. The
DocumentService requires no modification; the new storage mechanism can
be "plugged in" simply by changing which concrete class is provided to
the service at runtime.<sup>14</sup> This ability to adapt to new
requirements with minimal disruption is a hallmark of a
well-architected, maintainable system.<sup>21</sup>

### C. A Cornerstone of Testability

One of the most powerful and immediate benefits of DIP is its profound
impact on testability. It is widely regarded as a prerequisite for
effective, isolated unit testing.<sup>1</sup> In a system without DIP,
testing a high-level business logic class is often difficult because it
is directly coupled to its low-level dependencies. To test an

OrderProcessor, one might need to have a real database running, a live
connection to a payment gateway, and a functioning email server. Such
tests are slow, brittle, and are more accurately described as
integration tests, not unit tests.

DIP resolves this problem elegantly. Because the OrderProcessor depends
on abstractions like IOrderRepository, IPaymentGateway, and
IEmailSender, these real dependencies can be easily replaced during
testing with test doubles, such as mock objects or stubs.<sup>1</sup> A
developer can create a simple, in-memory

MockOrderRepository that returns predictable data without ever touching
a database. This allows the business logic of the OrderProcessor to be
tested in complete isolation, verifying its correctness without the
overhead, complexity, and non-determinism of its external
dependencies.<sup>22</sup> This capability is not just a convenience; it
is a fundamental enabler for practices like Test-Driven Development
(TDD) and continuous integration, which rely on fast, reliable, and
comprehensive automated test suites.<sup>15</sup>

### D. Fostering Scalability and Reusability

The flexibility endowed by DIP is also a key driver of scalability and
reusability.

**Scalability** in this context refers to the ability of the system to
grow in functionality over time. Because high-level modules are closed
to modification, new features can often be added simply by creating new
low-level implementations.<sup>7</sup> If an application needs to
support a new notification channel, like push notifications, a developer
can create a

PushNotificationService that implements the existing
INotificationService interface. No changes are needed in the core logic
that triggers notifications; the new capability is added as a modular
extension.<sup>14</sup>

**Reusability** is enhanced because the high-level, policy-rich modules
are not tied to any specific implementation context.<sup>6</sup> A
well-designed, generic

DataProcessingEngine that depends on IDataSource and IDataSink
abstractions could be packaged as a library and reused across many
different projects. In one project, it might be configured with
CsvFileSource and XmlFileSink implementations. In another, it could be
used with RestApiSource and DatabaseSink implementations. The core,
valuable logic of the engine is reused without modification because DIP
has severed its ties to any particular I/O mechanism.

Ultimately, these benefits are interconnected. The decoupling provided
by DIP enables the flexibility to swap components. This flexibility
makes the system more maintainable and scalable. The same decoupling,
through the use of abstractions, is what makes the system highly
testable. This improved testability gives developers the confidence to
make changes, which further enhances maintainability. DIP, therefore, is
not just a single principle but an enabling principle that creates an
architectural environment where other software quality attributes can
thrive. It is an investment in the long-term health of a codebase, a
strategic decision to manage the inevitable reality of change by
architecturally separating the stable from the volatile.

## III. From Theory to Practice: Implementing Dependency Inversion

Understanding the principles and benefits of DIP is foundational, but
its true value is realized through practical application. This section
grounds the abstract concepts in concrete code, presenting case studies
in TypeScript, Python, and Java. Each case study will illustrate a
common scenario, first demonstrating a violation of the principle and
its associated problems, and then showing a refactored, DIP-compliant
solution that resolves these issues.

### A. Case Study 1: A TypeScript/NestJS Payment Processing System

This example, based on a system built with the NestJS framework,
demonstrates how DIP is applied in a modern, dependency
injection-centric environment.<sup>13</sup>

#### Before DIP (Violation)

Consider a PaymentController responsible for handling payment requests.
In a naive implementation, it might be tightly coupled to a specific
payment service:

> TypeScript

// credit-card-payment.service.ts  
export class CreditCardPaymentService {  
processPayment(amount: number): string {  
return \`Processed payment of \$\${amount} via Credit Card.\`;  
}  
}  
  
// payment.controller.ts  
import { Controller, Get } from '@nestjs/common';  
import { CreditCardPaymentService } from
'./credit-card-payment.service';  
  
@Controller('payments')  
export class PaymentController {  
// Direct instantiation and dependency on a concrete class  
private paymentService = new CreditCardPaymentService();  
  
@Get()  
process(): string {  
return this.paymentService.processPayment(100);  
}  
}

**Analysis of Violation:** This design suffers from several critical
flaws <sup>13</sup>:

1.  **Tight Coupling:** The PaymentController (a high-level module) has
    a direct source code dependency on CreditCardPaymentService (a
    low-level module).

2.  **Rigidity:** If the business decides to add PayPal as a payment
    option, the PaymentController code must be modified. This violates
    the Open/Closed Principle.

3.  **Untestability:** Unit testing the PaymentController in isolation
    is nearly impossible. The test would be forced to run with a real
    CreditCardPaymentService instance, making it difficult to mock the
    service's behavior.

#### After DIP (Adherence)

The solution is to introduce an abstraction that the controller can
depend on, and then use NestJS's dependency injection system to provide
the concrete implementation.<sup>13</sup>

1\. Define the Abstraction (Interface):

An interface is created to define the contract for any payment service.
This interface is owned by the high-level module.

> TypeScript

// payment-service.interface.ts  
export interface PaymentService {  
processPayment(amount: number): string;  
}

2\. Create Concrete Implementations:

Multiple concrete classes are created, each implementing the
PaymentService interface. They depend on the abstraction.

> TypeScript

// credit-card-payment.service.ts  
import { Injectable } from '@nestjs/common';  
import { PaymentService } from './payment-service.interface';  
  
@Injectable()  
export class CreditCardPaymentService implements PaymentService {  
processPayment(amount: number): string {  
return \`Processed payment of \$\${amount} via Credit Card.\`;  
}  
}  
  
// paypal-payment.service.ts  
import { Injectable } from '@nestjs/common';  
import { PaymentService } from './payment-service.interface';  
  
@Injectable()  
export class PaypalPaymentService implements PaymentService {  
processPayment(amount: number): string {  
return \`Processed payment of \$\${amount} via PayPal.\`;  
}  
}

3\. Refactor the High-Level Module:

The PaymentController is modified to depend on the PaymentService
interface. The concrete instance is "injected" via the constructor.

> TypeScript

// payment.controller.ts  
import { Controller, Get } from '@nestjs/common';  
import { PaymentService } from './payment-service.interface';  
  
@Controller('payments')  
export class PaymentController {  
// Dependency is on the abstraction  
constructor(private readonly paymentService: PaymentService) {}  
  
@Get()  
process(): string {  
return this.paymentService.processPayment(100);  
}  
}

**Analysis of Improvement:** The refactored design is vastly superior.
The PaymentController is now completely decoupled from the specific
payment mechanism. It can work with any class that adheres to the
PaymentService contract. Adding new payment methods requires no changes
to the controller, only the creation of a new service class, thus
satisfying the Open/Closed Principle. Furthermore, the controller is now
easily testable by injecting a mock implementation of PaymentService in
a test environment.

### B. Case Study 2: A Python Data Access Layer

This example illustrates how DIP can be applied in Python to decouple an
application's front-end logic from its data source, enabling flexibility
and supporting the Open/Closed Principle.<sup>23</sup>

#### Before DIP (Violation)

Imagine a simple application where a FrontEnd class is responsible for
displaying data obtained from a BackEnd class that is hardwired to a
database.

> Python

\# app_dip_before.py  
class BackEnd:  
def get_data_from_database(self):  
return "Data from the database"  
  
class FrontEnd:  
def \_\_init\_\_(self, back_end: BackEnd):  
self.back_end = back_end  
  
def display_data(self):  
data = self.back_end.get_data_from_database()  
print(f"Display data: {data}")

**Analysis of Violation:** The FrontEnd class is tightly coupled to the
BackEnd class and, more specifically, to its method
get_data_from_database. If a new requirement arises to fetch data from a
REST API, the BackEnd class would need to be modified, and consequently,
the FrontEnd class would also likely need changes to call a new method.
This rigid structure makes extension difficult and violates
OCP.<sup>23</sup>

#### After DIP (Adherence)

To fix this, an abstraction is introduced using Python's abc (Abstract
Base Classes) module.

1\. Define the Abstraction (Abstract Base Class):

A DataSource abstract class is created to define the interface that the
FrontEnd will use.

> Python

\# app_dip_after.py  
from abc import ABC, abstractmethod  
  
class DataSource(ABC):  
@abstractmethod  
def get_data(self):  
pass

2\. Create Concrete Implementations:

Concrete classes for each data source are created, inheriting from the
DataSource abstraction.

> Python

class Database(DataSource):  
def get_data(self):  
return "Data from the database"  
  
class API(DataSource):  
def get_data(self):  
return "Data from the API"

3\. Refactor the High-Level Module:

The FrontEnd class is refactored to depend on the DataSource
abstraction, not on any concrete implementation.

> Python

class FrontEnd:  
def \_\_init\_\_(self, data_source: DataSource):  
self.data_source = data_source  
  
def display_data(self):  
data = self.data_source.get_data()  
print(f"Display data: {data}")

**Analysis of Improvement:** The FrontEnd is now decoupled from the
specifics of data retrieval. The client code can instantiate FrontEnd
with either a Database object or an API object, and the display_data
method works seamlessly with both.<sup>23</sup> The system is now open
for extension; a new

FileDataSource could be added without ever modifying the FrontEnd class.

### C. Case Study 3: A Java Notification Service

This Java example demonstrates decoupling a high-level notification
manager from the low-level delivery mechanisms.<sup>9</sup>

#### Before DIP (Violation)

A NotificationManager class directly creates and uses an
EmailNotificationService.

> Java

// EmailNotificationService.java  
public class EmailNotificationService {  
public void sendNotification(String message) {  
// Logic to send an email  
System.out.println("Sending Email: " + message);  
}  
}  
  
// NotificationManager.java  
public class NotificationManager {  
private EmailNotificationService emailService;  
  
public NotificationManager() {  
this.emailService = new EmailNotificationService(); // Tight coupling  
}  
  
public void doNotify(String message) {  
this.emailService.sendNotification(message);  
}  
}

**Analysis of Violation:** The NotificationManager is rigidly bound to
sending notifications via email. If the system needs to support SMS
notifications, the NotificationManager class must be fundamentally
changed, likely with conditional logic to decide which service to use.
This makes the code brittle and hard to maintain.<sup>24</sup>

#### After DIP (Adherence)

An interface is introduced to abstract the concept of a notification
service.

**1. Define the Abstraction (Interface):**

> Java

// NotificationService.java  
public interface NotificationService {  
void sendNotification(String message);  
}

**2. Create Concrete Implementations:**

> Java

// EmailNotificationService.java  
public class EmailNotificationService implements NotificationService {  
@Override  
public void sendNotification(String message) {  
System.out.println("Sending Email: " + message);  
}  
}  
  
// SmsNotificationService.java  
public class SmsNotificationService implements NotificationService {  
@Override  
public void sendNotification(String message) {  
System.out.println("Sending SMS: " + message);  
}  
}

**3. Refactor the High-Level Module:**

> Java

// NotificationManager.java  
public class NotificationManager {  
private NotificationService notificationService;  
  
// Dependency is injected via the constructor  
public NotificationManager(NotificationService notificationService) {  
this.notificationService = notificationService;  
}  
  
public void doNotify(String message) {  
this.notificationService.sendNotification(message);  
}  
}

**Analysis of Improvement:** The NotificationManager is now flexible and
extensible. It depends only on the NotificationService interface and is
completely unaware of the delivery mechanism. It can be configured at
runtime to use email, SMS, or any future notification service that
implements the interface, perfectly demonstrating the power of DIP.

### D. Relationship to Design Patterns

While DIP is a principle, its practical implementation often involves
the use of established design patterns that provide solutions for object
creation and behavior delegation.<sup>1</sup>

- **Factory Pattern:** To avoid littering the application's entry point
  (the "Composition Root") with new keywords, a Factory or Abstract
  Factory pattern can be used. This pattern centralizes the creation of
  the concrete low-level objects, further isolating the business logic
  from instantiation details.<sup>1</sup>

- **Strategy Pattern:** The very essence of the DIP-compliant examples
  above is an application of the Strategy pattern. The high-level module
  (the context) is configured with a specific strategy (the concrete
  low-level implementation) that conforms to a common interface. This
  allows the algorithm or behavior to be selected and swapped at
  runtime.<sup>1</sup>

- **Adapter Pattern:** DIP is particularly valuable when integrating
  with third-party libraries or legacy systems whose code cannot be
  modified. If an external library does not conform to the interface
  required by your high-level module, you can write an Adapter class.
  This adapter implements your application's interface and internally
  translates the calls to the third-party library's specific API. This
  allows the high-level module to remain decoupled, adhering to DIP even
  when dealing with external constraints.<sup>4</sup>

## IV. The Ecosystem of Inversion: DIP, DI, and IoC Demystified

The concepts of Dependency Inversion Principle (DIP), Dependency
Injection (DI), and Inversion of Control (IoC) are deeply intertwined,
yet fundamentally distinct. The frequent and often incorrect use of
these terms as synonyms is a primary source of confusion in software
design discussions.<sup>7</sup> Establishing a clear and precise
understanding of each concept and its relationship to the others is
critical for effective architectural reasoning.

### A. Inversion of Control (IoC): The "Hollywood Principle"

Inversion of Control is the broadest and most foundational of the three
concepts. It is a design paradigm, not a specific pattern or principle,
that describes a shift in the control flow of a program.<sup>8</sup> In
traditional procedural programming, the custom code written by a
developer is in complete control. It dictates the flow of execution,
calling library functions when needed. IoC inverts this
relationship.<sup>8</sup> Under an IoC paradigm, a generic, reusable
framework dictates the flow of execution and calls back into the
custom-written code at specific points.

This is famously known as the "Hollywood Principle": *Don't call us,
we'll call you*.<sup>11</sup> The quintessential example is a modern
graphical user interface (GUI) framework.<sup>10</sup> A developer does
not write the main event loop that listens for mouse clicks, key
presses, and window resize events. The framework provides this loop. The
developer's role is to provide specific event handler methods (e.g.,

on_button_click) that the framework will call when the corresponding
event occurs. The control is inverted; the framework is in charge, and
the application code simply plugs into it.<sup>10</sup> IoC is a general
characteristic of frameworks and can be implemented through various
mechanisms, including events, callbacks, and the template method
pattern.<sup>8</sup>

### B. Dependency Injection (DI): A Pattern for Wiring

Dependency Injection is a specific design pattern that implements one
form of Inversion of Control.<sup>8</sup> Its focus is narrower than the
general IoC paradigm; it is concerned specifically with inverting the
control over how a component acquires its dependencies.<sup>7</sup>

In a design without DI, a component is responsible for creating or
obtaining its own dependencies. For example, a Car object might create
its own Engine object: this.engine = new V8Engine();. This creates tight
coupling. With DI, this responsibility is inverted. The component
declares its need for a dependency, and an external entity—the
"injector" or "assembler"—provides a suitable
implementation.<sup>10</sup> The dependency is "injected" into the
component from the outside.

There are three primary forms of Dependency Injection <sup>10</sup>:

1.  **Constructor Injection:** Dependencies are provided as parameters
    to the component's constructor. This is often the preferred method
    as it ensures the component is in a valid state upon creation.

2.  **Setter Injection:** Dependencies are provided through public
    setter methods. This allows for dependencies to be changed after the
    object has been created.

3.  **Interface Injection:** The component implements an interface that
    defines a method for injecting the dependency.

Frameworks like Spring (for Java) or NestJS (for TypeScript) provide
powerful DI containers (often called IoC containers, which adds to the
confusion) that automate the process of creating, configuring, and
injecting these dependencies throughout an application.<sup>8</sup>

### C. Dependency Inversion Principle (DIP): An Architectural Guideline

The Dependency Inversion Principle is a high-level architectural
guideline and one of the five SOLID principles. Unlike DI (a pattern)
and IoC (a paradigm), DIP is a rule about the structure of dependencies.
It dictates *what* software modules should depend on, not *how* those
dependencies are provided.<sup>11</sup>

The core mandate of DIP is to depend on abstractions, not on concrete
implementations.<sup>27</sup> It is entirely possible to use the
Dependency Injection pattern while violating the Dependency Inversion
Principle. For instance, one could inject a concrete

CreditCardPaymentService class directly into a PaymentController. This
is DI, as the controller is not creating the service itself, but it
violates DIP because the high-level controller now depends on a
low-level concrete class.<sup>29</sup>

Conversely, it is possible to adhere to DIP without using a DI
framework. A developer can manually implement DI (a practice sometimes
called "Pure DI") by using factory patterns to create concrete objects
and pass them into constructors that accept abstract interfaces. The key
is that the dependency relationship itself is inverted to target an
abstraction.

### D. Synthesizing the Concepts

The relationship between these three concepts can be summarized as a
hierarchy of scope and purpose. IoC is the general principle of
inverting control. DI is a specific pattern that implements IoC for the
purpose of managing dependencies. DIP is a specific architectural
guideline that, when followed, leverages DI to create a loosely coupled
system.

A powerful and concise way to distinguish them, popularized by Martin
Fowler's work, is as follows: **"DI is about wiring, IoC is about
direction, and DIP is about the shape \[of the
abstraction\]"**.<sup>11</sup>

- **IoC (Direction):** Who is in control? Who initiates the call? The
  framework (IoC) or my code (traditional control)?

- **DI (Wiring):** How does a component get its dependencies? Does it
  create them itself (no DI), or are they passed in from an external
  source (DI)?

- **DIP (Shape):** What is the nature of the dependency being passed in?
  Is it a concrete class (violates DIP), or is it an abstract interface
  (adheres to DIP)?

Therefore, the ideal modern architectural approach is to use the
**Dependency Injection (DI)** pattern to implement the **Inversion of
Control (IoC)** paradigm for managing dependencies, which in turn allows
the architecture to adhere to the **Dependency Inversion Principle
(DIP)** by ensuring that the dependencies being injected are
abstractions rather than concretions.

To crystallize these distinctions, the following table provides a direct
comparison across key criteria.

| **Concept** | **What It Is** | **Primary Goal** | **Example** |
|----|----|----|----|
| **Inversion of Control (IoC)** | A broad design paradigm. | To invert the flow of control from the application to a framework. | A UI framework that calls your onClick event handler.<sup>10</sup> |
| **Dependency Injection (DI)** | A specific design pattern. | To provide a component with its dependencies from an external source. | A PaymentController's constructor accepting a paymentService object.<sup>7</sup> |
| **Dependency Inversion Principle (DIP)** | A specific design principle (the 'D' in SOLID). | To ensure high-level modules depend on abstractions, not concrete low-level modules. | The paymentService object being of type IPaymentService (an interface), not CreditCardService (a class).<sup>11</sup> |

## V. Synergies and Interplay: DIP within the SOLID Framework

The SOLID principles are not a mere checklist of independent rules; they
form an interconnected system of guidelines that reinforce one another
to produce robust, maintainable, and flexible object-oriented
designs.<sup>2</sup> The Dependency Inversion Principle, as the most
architecturally significant of the five, has a particularly strong
synergistic relationship with the others. It often acts as the
structural foundation that makes the behavioral goals of the other
principles feasible at a system-wide level.

### A. DIP as the Enabler of the Open/Closed Principle (OCP)

The strongest and most direct synergy exists between DIP and the
Open/Closed Principle (OCP). OCP states that software entities (classes,
modules, functions) should be open for extension but closed for
modification.<sup>2</sup> This means it should be possible to add new
functionality to a system without changing existing, working code.

On its own, OCP is a laudable goal, but it can be difficult to achieve
in practice. The Dependency Inversion Principle provides the primary
mechanism to realize this goal at an architectural scale.<sup>3</sup> By
mandating that high-level modules depend on abstractions, DIP
effectively "closes" these modules to modification. The high-level

PaymentController from the earlier example, which depends on the
PaymentService interface, does not need to be changed to accommodate new
payment methods. Its behavior is fixed and stable.

Simultaneously, the system remains "open" for extension. New
functionality, such as a StripePaymentService or a CryptoPaymentService,
can be introduced by simply creating new low-level classes that
implement the existing PaymentService abstraction.<sup>15</sup> No code
in the high-level module is touched. Therefore, adherence to DIP is the
structural prerequisite that allows a system to satisfy the behavioral
mandate of OCP. Without the inverted dependency on an abstraction,
extending the system's behavior would almost certainly require modifying
the high-level client code, thus violating OCP.<sup>23</sup>

### B. The Role of the Interface Segregation Principle (ISP)

The Interface Segregation Principle (ISP) guides the design of the
abstractions that are central to DIP. ISP states that clients should not
be forced to depend on methods they do not use.<sup>2</sup> This
advocates for creating small, cohesive, client-specific interfaces
rather than large, general-purpose ones.

The relationship is symbiotic. When creating an abstraction to satisfy
DIP, ISP provides the qualitative criteria for what makes a *good*
abstraction. If a high-level module only needs to read data, its
dependency interface should not also include methods for writing,
updating, and deleting data. A large, "fat" interface that includes
unused methods violates ISP and introduces unnecessary
coupling.<sup>14</sup> It forces implementing classes to provide stub
implementations for methods they cannot support, which is a design
smell.

By applying ISP, the abstractions used for dependency inversion become
lean, focused, and tailored to the specific needs of the high-level
client. This results in a cleaner separation of concerns and ensures
that the contract between the high-level and low-level modules is as
minimal and precise as possible. A well-factored set of small interfaces
is more reusable and leads to a more decoupled system than a single
monolithic one.

### C. Interaction with Liskov Substitution Principle (LSP)

The Liskov Substitution Principle (LSP) provides the behavioral
guarantee that makes the polymorphism enabled by DIP reliable. LSP
states that objects of a superclass should be replaceable with objects
of its subclasses without affecting the correctness of the
program.<sup>2</sup> In the context of DIP, this means that any concrete
implementation of an interface must be substitutable for any other
implementation without breaking the high-level client.

DIP creates the architectural structure for interchangeability; LSP
defines the behavioral contract that makes this interchangeability safe.
If a new PremiumPaymentGateway is created to implement the
IPaymentGateway interface, it must adhere to the same preconditions,
postconditions, and invariants as the original StandardPaymentGateway.
It cannot throw unexpected exceptions or produce invalid state that the
high-level PaymentController is not designed to handle.

Therefore, LSP is the principle that ensures the "pluggable" nature of a
DIP-compliant architecture actually works as intended. Without LSP,
swapping implementations could introduce subtle and dangerous bugs,
undermining the very flexibility and robustness that DIP aims to
provide.<sup>3</sup>

In summary, the SOLID principles function as a cohesive whole. DIP
provides the architectural structure by inverting dependencies onto
abstractions. ISP ensures these abstractions are well-designed and
cohesive. LSP ensures that the various implementations of these
abstractions are behaviorally consistent and safely interchangeable.
Together, they enable the creation of systems that satisfy OCP—systems
that can gracefully evolve and grow over time. A failure to adhere to
DIP often signals a deeper architectural problem, one that likely
entails violations of other SOLID principles and results in a rigid,
fragile, and difficult-to-maintain system.

## VI. A Critical Perspective: The Pragmatics of Applying and Deviating from DIP

While the Dependency Inversion Principle is a powerful tool for building
resilient and maintainable software, its dogmatic and indiscriminate
application can lead to over-engineering and unnecessary complexity.
Architectural wisdom lies not in blind adherence to principles, but in
understanding when and where to apply them to achieve the greatest
benefit. This section provides a critical and pragmatic examination of
DIP, exploring its potential pitfalls and outlining guidelines for its
judicious application.

### A. The Perils of Over-Abstraction

The most common pitfall when implementing DIP is the tendency towards
over-abstraction—creating interfaces for every class as a matter of
course.<sup>14</sup> This practice, often born from a misunderstanding
of the principle's intent, can be counterproductive. It leads to
"interface pollution," where the codebase becomes cluttered with a
proliferation of abstract types that add little value.<sup>24</sup>

This excessive layering introduces significant cognitive overhead and
navigational complexity. Instead of being able to directly navigate from
a method call to its implementation, a developer must first navigate to
an interface and then search for all its implementations. This
indirection can make the code harder to trace, debug, and understand,
especially for new team members.<sup>24</sup> Every abstraction is a
design choice that carries a cost in complexity. The key is to ensure
that the flexibility gained from the abstraction outweighs this cost.
The YAGNI ("You Ain't Gonna Need It") principle serves as a crucial
counterbalance to the zealous application of DIP. One should not
abstract a dependency based on a hypothetical future need that may never
materialize.<sup>22</sup> Abstraction should be driven by a genuine,
anticipated need for volatility management or interchangeability.

### B. When to Deviate: Identifying Stable Dependencies

The core purpose of DIP is to protect high-level modules from changes in
volatile low-level modules. It follows, then, that it is generally
unnecessary and even detrimental to abstract dependencies that are
stable and not expected to change. Depending directly on a concrete
class is perfectly acceptable if that class is a stable part of the
platform or a foundational library.<sup>14</sup>

Examples of justifiable deviations from DIP include:

- **Core Language/Platform Libraries:** It would be nonsensical to
  create an IString or IList interface to abstract away the standard
  string and list types provided by a language's standard library. These
  are considered globally stable dependencies.<sup>31</sup>

- **Stable Third-Party Libraries:** While it is wise to abstract
  dependencies on external services that might be swapped (like payment
  gateways), it is often acceptable to depend directly on stable,
  foundational libraries. For example, if an application is deeply
  integrated with a specific logging framework like Log4j and there is
  no realistic scenario in which it would be replaced, abstracting it
  may be an unnecessary effort.

- **The Composition Root:** There must be one place in every application
  where the object graph is assembled. This location, often called the
  Composition Root or the main function, is the only part of the system
  that is allowed to know about and instantiate concrete types to be
  injected elsewhere. This component, by its very nature, violates DIP,
  and this is not only acceptable but necessary.<sup>35</sup>

- **Truly Invariant Implementations:** If a class is designed to solve a
  problem for which there is genuinely only one implementation, and this
  is unlikely to ever change, creating an interface for it is a form of
  over-engineering.<sup>14</sup>

### C. Performance and Low-Level Considerations

In certain specialized domains, particularly high-performance computing,
the costs of abstraction cannot be ignored. Calling a method through an
interface or a virtual function table (virtual dispatch) incurs a small
but measurable performance overhead compared to a direct, static call to
a concrete method.<sup>22</sup> In systems where every nanosecond
counts, such as in graphics rendering, scientific computing, or
high-frequency trading, this overhead can be prohibitive.

Furthermore, for certain low-level data structures and algorithms, the
implementation is intrinsically tied to concrete types for optimization.
A high-performance hash table's logic depends on the specific memory
layout of a concrete array, not an abstract IArray
interface.<sup>31</sup> In these cases, the performance requirements and
the nature of the problem domain take precedence over the goal of
architectural flexibility offered by DIP.

### D. Guidelines for Judicious Application

The decision to apply DIP should be a deliberate architectural choice
based on the specific context of the module in question. The following
guidelines can help in making this decision:

- **Apply DIP at Architectural Boundaries:** The principle is most
  valuable when applied at the seams between major architectural layers.
  The boundary between the application/domain layer and the
  infrastructure layer is the canonical use case. This protects the core
  business logic from changes in the database, file system, or external
  APIs.<sup>5</sup>

- **Abstract Volatility:** Identify the parts of the system that are
  most likely to change or need alternative implementations. These are
  prime candidates for abstraction. Dependencies on external services,
  data storage mechanisms, and user interface frameworks are common
  examples.<sup>14</sup>

- **Use DIP to Break Cycles:** If two packages or modules have a
  circular dependency, introducing an interface owned by one of the
  modules can often be used to break the cycle and re-establish a clear,
  acyclic dependency graph.

- **Avoid Abstracting the Domain Model:** Core domain entities, which
  represent the business concepts themselves, are typically concrete.
  Their identity is tied to their data and behavior, and they are not
  usually a point of volatility that needs to be abstracted
  away.<sup>31</sup>

Ultimately, the Dependency Inversion Principle is a means to an end—the
end being a more maintainable, flexible, and resilient system. It should
be applied strategically to manage complexity and change where it is
most likely to occur, not as a blanket rule that adds complexity without
commensurate benefit.<sup>24</sup>

## Conclusion: Synthesizing the Principle for Robust and Future-Proof Architectures

The Dependency Inversion Principle, the culminating principle of the
SOLID framework, represents a critical paradigm shift in software
architecture. Its core purpose is to architecturally subordinate
volatile implementation details to stable business policies. This is
achieved not by a simple reversal of dependency arrows, but by a more
sophisticated restructuring: the introduction of abstractions, owned by
the high-level policy modules, upon which both the high-level policies
and the low-level details depend. This inversion of ownership creates a
stable architectural core, insulated from the churn of technology and
implementation specifics.

This report has demonstrated that DIP is not an isolated guideline but
the structural linchpin that enables the realization of other design
goals. When enabled by the practical pattern of Dependency Injection and
guided by the qualitative criteria of the Interface Segregation and
Liskov Substitution Principles, DIP provides the architectural
foundation necessary to achieve the behavioral mandate of the
Open/Closed Principle. The result is a system that is simultaneously
stable and flexible—closed to modification in its core logic, yet open
to extension through the addition of new, pluggable implementation
modules. The tangible benefits are profound, manifesting as enhanced
modularity, superior testability, and a marked increase in the long-term
maintainability and scalability of the software.

The enduring relevance of the Dependency Inversion Principle cannot be
overstated. In the landscape of modern software development,
characterized by complex, distributed systems and the rapid evolution of
technology, its importance has only intensified. Architectural patterns
such as Microservices, Clean Architecture, and Hexagonal (Ports and
Adapters) Architecture are not merely compatible with DIP; they are
direct, large-scale expressions of it.<sup>5</sup> For these
architectures, DIP is the foundational concept that makes their promises
of independent deployability, technological agnosticism, and resilience
to change a practical reality. Mastering the Dependency Inversion
Principle—understanding its deep rationale, its practical application,
and its pragmatic limitations—is therefore an essential competency for
any architect or engineer seeking to build robust, adaptable, and truly
future-proof software systems.<sup>19</sup>

#### Works cited

1.  What is the Dependency Inversion Principle? - The Coding Machine,
    accessed August 22, 2025,
    [<u>https://thecodingmachine.com/en/what-is-dependency-inversion-principle/</u>](https://thecodingmachine.com/en/what-is-dependency-inversion-principle/)

2.  A Solid Guide to SOLID Principles - Baeldung, accessed August 22,
    2025,
    [<u>https://www.baeldung.com/solid-principles</u>](https://www.baeldung.com/solid-principles)

3.  SOLID Design Principles Explained: Dependency Inversion- Stackify,
    accessed August 22, 2025,
    [<u>https://stackify.com/dependency-inversion-principle/</u>](https://stackify.com/dependency-inversion-principle/)

4.  Dependency inversion principle - Wikipedia, accessed August 22,
    2025,
    [<u>https://en.wikipedia.org/wiki/Dependency_inversion_principle</u>](https://en.wikipedia.org/wiki/Dependency_inversion_principle)

5.  The importance of the dependency inversion principle - Triple D,
    accessed August 22, 2025,
    [<u>https://www.tripled.io/07/05/2019/dependency-inversion-principle/</u>](https://www.tripled.io/07/05/2019/dependency-inversion-principle/)

6.  oop - What is the dependency inversion principle and why is it
    important? - Stack Overflow, accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/62539/what-is-the-dependency-inversion-principle-and-why-is-it-important</u>](https://stackoverflow.com/questions/62539/what-is-the-dependency-inversion-principle-and-why-is-it-important)

7.  SOLID — Dependency Inversion Principle (Part 5) \| by Matthias
    Schenk \| Medium, accessed August 22, 2025,
    [<u>https://medium.com/@inzuael/solid-dependency-inversion-principle-part-5-f5bec43ab22e</u>](https://medium.com/@inzuael/solid-dependency-inversion-principle-part-5-f5bec43ab22e)

8.  Inversion of Control vs Dependency Injection - Stack Overflow,
    accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/6550700/inversion-of-control-vs-dependency-injection</u>](https://stackoverflow.com/questions/6550700/inversion-of-control-vs-dependency-injection)

9.  The Dependency Inversion Principle in Java - Baeldung, accessed
    August 22, 2025,
    [<u>https://www.baeldung.com/java-dependency-inversion-principle</u>](https://www.baeldung.com/java-dependency-inversion-principle)

10. Inversion of Control Containers and the Dependency Injection
    pattern, accessed August 22, 2025,
    [<u>https://martinfowler.com/articles/injection.html</u>](https://martinfowler.com/articles/injection.html)

11. Difference between "Inversion of Control", "Dependency inversion"
    and "Decoupling" - Stack Overflow, accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/3912504/difference-between-inversion-of-control-dependency-inversion-and-decouplin</u>](https://stackoverflow.com/questions/3912504/difference-between-inversion-of-control-dependency-inversion-and-decouplin)

12. How is Inversion of Control related to Dependency Inversion -
    Software Engineering Stack Exchange, accessed August 22, 2025,
    [<u>https://softwareengineering.stackexchange.com/questions/311674/how-is-inversion-of-control-related-to-dependency-inversion</u>](https://softwareengineering.stackexchange.com/questions/311674/how-is-inversion-of-control-related-to-dependency-inversion)

13. Dependency Inversion Principle (SOLID Principles) \| by Bale \|
    Medium, accessed August 22, 2025,
    [<u>https://medium.com/@bloodturtle/dependency-inversion-principle-solid-principles-96242e210951</u>](https://medium.com/@bloodturtle/dependency-inversion-principle-solid-principles-96242e210951)

14. Understanding the dependency inversion principle (DIP) - LogRocket
    Blog, accessed August 22, 2025,
    [<u>https://blog.logrocket.com/dependency-inversion-principle/</u>](https://blog.logrocket.com/dependency-inversion-principle/)

15. System Design: Dependency Inversion Principle \| Baeldung on
    Computer Science, accessed August 22, 2025,
    [<u>https://www.baeldung.com/cs/dip</u>](https://www.baeldung.com/cs/dip)

16. Part 6: Dependency Inversion Principle (DIP) \| by Bhanu Kumar \|
    Code and Concepts, accessed August 22, 2025,
    [<u>https://medium.com/code-and-concepts/part-6-dependency-inversion-principle-dip-13d454ca4c1a</u>](https://medium.com/code-and-concepts/part-6-dependency-inversion-principle-dip-13d454ca4c1a)

17. SOLID Principles: Interface Segregation and Dependency Inversion,
    accessed August 22, 2025,
    [<u>https://sjinnovation.com/mastering-solid-principles-software-development-real-world-analogies-part-2</u>](https://sjinnovation.com/mastering-solid-principles-software-development-real-world-analogies-part-2)

18. What is the difference between Dependency Inversion and the
    Separated Interface pattern (or Code to interface in general)? -
    Stack Overflow, accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/20700098/what-is-the-difference-between-dependency-inversion-and-the-separated-interface</u>](https://stackoverflow.com/questions/20700098/what-is-the-difference-between-dependency-inversion-and-the-separated-interface)

19. The Power of Dependency Inversion Principle (DIP) in Software
    Development, accessed August 22, 2025,
    [<u>https://dev.to/tkarropoulos/the-power-of-dependency-inversion-principle-dip-in-software-development-4klk</u>](https://dev.to/tkarropoulos/the-power-of-dependency-inversion-principle-dip-in-software-development-4klk)

20. Dependency Inversion Principle in System Design - Naukri Code 360,
    accessed August 22, 2025,
    [<u>https://www.naukri.com/code360/library/dependency-inversion-principle-in-system-design</u>](https://www.naukri.com/code360/library/dependency-inversion-principle-in-system-design)

21. Dependency Inversion Principle. Decoupling High-Level Logic from… \|
    by Alyaa Talaat, accessed August 22, 2025,
    [<u>https://medium.com/@alyaatalaat205/dependency-inversion-principle-clean-mobile-architecture-by-petros-efthymiou-eb85571296c5</u>](https://medium.com/@alyaatalaat205/dependency-inversion-principle-clean-mobile-architecture-by-petros-efthymiou-eb85571296c5)

22. Is dependency inversion principle necessary? - Software Engineering
    Stack Exchange, accessed August 22, 2025,
    [<u>https://softwareengineering.stackexchange.com/questions/418446/is-dependency-inversion-principle-necessary</u>](https://softwareengineering.stackexchange.com/questions/418446/is-dependency-inversion-principle-necessary)

23. SOLID Principles: Improve Object-Oriented Design in Python, accessed
    August 22, 2025,
    [<u>https://realpython.com/solid-principles-python/</u>](https://realpython.com/solid-principles-python/)

24. what is the dependency inversion principle - davidalex.ca, accessed
    August 22, 2025,
    [<u>https://www.davidalex.ca/blogs/dependency-inversion-solid-principle</u>](https://www.davidalex.ca/blogs/dependency-inversion-solid-principle)

25. SOLID Principles-The Dependency Inversion Principle -
    JavaTechOnline, accessed August 22, 2025,
    [<u>https://javatechonline.com/solid-principles-the-dependency-inversion-principle/</u>](https://javatechonline.com/solid-principles-the-dependency-inversion-principle/)

26. Dependency Inversion Principle (SOLID) vs Encapsulation (Pillars of
    OOP) - Stack Overflow, accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/31121611/dependency-inversion-principle-solid-vs-encapsulation-pillars-of-oop</u>](https://stackoverflow.com/questions/31121611/dependency-inversion-principle-solid-vs-encapsulation-pillars-of-oop)

27. Python Dependency Inversion Principle - Python Tutorial, accessed
    August 22, 2025,
    [<u>https://www.pythontutorial.net/python-oop/python-dependency-inversion-principle/</u>](https://www.pythontutorial.net/python-oop/python-dependency-inversion-principle/)

28. Dependency Inversion Principle in Python \| by shailesh jadhav -
    nonstopio, accessed August 22, 2025,
    [<u>https://blog.nonstopio.com/dependency-inversion-principle-in-python-18bc0165e6f1</u>](https://blog.nonstopio.com/dependency-inversion-principle-in-python-18bc0165e6f1)

29. I can't understand tha "Singleton pattern violates DIP." - Stack
    Overflow, accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/78578446/i-cant-understand-tha-singleton-pattern-violates-dip</u>](https://stackoverflow.com/questions/78578446/i-cant-understand-tha-singleton-pattern-violates-dip)

30. 4\. Interface Segregation Principle (ISP): SOLID Principle \| by
    Ramdhas - Medium, accessed August 22, 2025,
    [<u>https://medium.com/@ramdhas/4-interface-segregation-principle-isp-solid-principle-39e477bae2e3</u>](https://medium.com/@ramdhas/4-interface-segregation-principle-isp-solid-principle-39e477bae2e3)

31. When NOT to apply the Dependency Inversion Principle?, accessed
    August 22, 2025,
    [<u>https://softwareengineering.stackexchange.com/questions/274459/when-not-to-apply-the-dependency-inversion-principle</u>](https://softwareengineering.stackexchange.com/questions/274459/when-not-to-apply-the-dependency-inversion-principle)

32. Dependency injection - Wikipedia, accessed August 22, 2025,
    [<u>https://en.wikipedia.org/wiki/Dependency_injection</u>](https://en.wikipedia.org/wiki/Dependency_injection)

33. What are the downsides to using dependency injection? \[closed\] -
    Stack Overflow, accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/2407540/what-are-the-downsides-to-using-dependency-injection</u>](https://stackoverflow.com/questions/2407540/what-are-the-downsides-to-using-dependency-injection)

34. The Dependency Inversion Principle For Beginners - Scott Hannen,
    accessed August 22, 2025,
    [<u>https://scotthannen.org/blog/2017/04/26/dependency-inversion-principle-for-beginners.html</u>](https://scotthannen.org/blog/2017/04/26/dependency-inversion-principle-for-beginners.html)

35. How to Implement Dependency Inversion and Interface Segregation for
    a Concrete Class that Needs to Be Initiated? - Stack Overflow,
    accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/78164916/how-to-implement-dependency-inversion-and-interface-segregation-for-a-concrete-c</u>](https://stackoverflow.com/questions/78164916/how-to-implement-dependency-inversion-and-interface-segregation-for-a-concrete-c)
