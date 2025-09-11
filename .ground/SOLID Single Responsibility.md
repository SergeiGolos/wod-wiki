# The Single Responsibility Principle: A Definitive Architectural Analysis

## Deconstructing the Single Responsibility Principle: Beyond the Acronym

The Single Responsibility Principle (SRP) is the first of the five
design principles aggregated under the SOLID acronym, a set of
guidelines for object-oriented design intended to produce more
understandable, flexible, and maintainable software. Introduced and
popularized by Robert C. Martin, often known as "Uncle Bob," the
principle is most frequently stated with a simple, canonical definition:
"A class should have only one reason to change".<sup>1</sup> While this
definition is concise, its apparent simplicity belies a deeper set of
concepts that have evolved over time and are rooted in the foundational
wisdom of software engineering. To truly grasp the SRP, one must look
beyond the acronym and understand its intellectual lineage, the critical
evolution of its definition, and the socio-technical problem it is
designed to solve.

### Intellectual Antecedents: Cohesion and Separation of Concerns

The Single Responsibility Principle did not emerge in a vacuum. Martin
himself described it as being based on earlier, well-established
principles of good design.<sup>2</sup> Its primary intellectual
antecedent is the principle of

**cohesion**, a concept from structured design championed by software
engineering pioneers like Tom DeMarco and Meilir Page-Jones in the late
1970s.<sup>2</sup> Cohesion measures the degree to which the elements
inside a module—be it a function, a class, or a service—are functionally
related and belong together.<sup>4</sup> A module with high cohesion has
elements that are tightly related and work together to fulfill a single,
well-defined purpose. Conversely, a module with low cohesion contains a
jumble of unrelated elements, making it difficult to understand, modify,
and reuse. SRP provides a concrete heuristic for achieving high cohesion
by defining "relatedness" in a very specific way.

The principle is also a direct application of the broader concept of
**Separation of Concerns (SoC)**, a term famously used by Edsger W.
Dijkstra.<sup>4</sup> SoC is a general problem-solving principle that
advocates for breaking a complex problem down into smaller, more
manageable parts that can be addressed independently. In software, this
manifests as separating a program into distinct sections, where each
section addresses a separate concern.<sup>6</sup> For example, the
Model-View-Controller (MVC) pattern is an application of SoC, separating
the concerns of data representation (Model), user interface (View), and
application logic (Controller). SRP takes this high-level architectural
idea and applies it at the granular level of a single class or module.

### The Definitive Evolution: From "Reason to Change" to "Actor"

The initial definition, "a class should have only one reason to change,"
proved to be a significant source of confusion. The ambiguity of the
phrase "reason to change" led to endless debate: Does fixing a bug
constitute a reason to change? Is refactoring a reason to
change?.<sup>4</sup> If so, then any change would violate the principle,
rendering it impractical. This widespread misinterpretation prompted
Martin to provide a crucial clarification that fundamentally reframes
the principle's intent.

The evolved and more precise definition of the Single Responsibility
Principle is: **"A module should be responsible to one, and only one,
actor"**.<sup>2</sup> An

**actor** is defined as a group of one or more stakeholders or users who
require a change in the module.<sup>2</sup> This redefinition is not a
minor tweak; it represents a fundamental pivot from a purely technical
concern to a socio-technical one. It moves the focus away from the
code's internal mechanics and onto the external forces that drive
modifications. The "reason to change" is not an abstract technical
property but a concrete request from a person or a group of people
within an organization.

This shift is critical because it reframes software design as an
activity that must align with the structure and communication pathways
of the organization it serves. The initial phrasing, centered on the
code itself, invited abstract technical debates. The refined definition,
however, is grounded in the human context of software development. The
boundaries of a module are no longer determined by what the code *does*,
but by *who* the code serves. Therefore, SRP is not merely a principle
of code organization; it is a principle of socio-technical alignment.
Its ultimate goal is to create software modules whose boundaries mirror
the boundaries of responsibility within the human organization, thereby
minimizing cross-team conflicts and the unintended consequences of
change. This evolution is the key to correctly understanding and
applying the principle in complex, real-world business environments.

## The "Why": Core Motivations and Architectural Benefits

The fundamental motivation behind the Single Responsibility Principle is
to manage complexity and build software systems that are resilient to
change.<sup>2</sup> In any long-lived software project, change is the
only constant. Business requirements evolve, technologies are updated,
and user needs shift. A design that does not account for this reality is
destined to become brittle and difficult to maintain. A class that
amasses multiple responsibilities becomes a fragile point of
convergence, a nexus of dependencies where a change made for one reason
can have unforeseen and damaging consequences on functionality that
appears unrelated.<sup>2</sup> Adhering to SRP mitigates this risk by
ensuring that the "blast radius" of any given change is contained within
a single, well-defined module.

This core motivation gives rise to a cascade of interconnected benefits
that collectively improve the quality, robustness, and longevity of a
software system. These advantages are not merely theoretical; they have
a tangible impact on development velocity, bug rates, and the overall
cost of ownership.

### A Cascade of Benefits

- **Enhanced Maintainability and Scalability:** When a class has a
  single responsibility, it is isolated from the concerns of other parts
  of the system. This makes it significantly easier to modify or extend
  its functionality without creating a ripple effect of breakages
  elsewhere. Changes are localized, which drastically reduces the risk
  of introducing new bugs.<sup>11</sup> This isolation of concerns is
  the bedrock of maintainable software. Furthermore, this modularity is
  a prerequisite for scalability; a system composed of independent,
  single-purpose components is far easier to grow and adapt over time.
  Empirical evidence supports this; one study published in the  
  *Journal of Systems and Software* found that the application of SRP
  can reduce the number of bugs by up to 40%.<sup>11</sup>

- **Improved Readability and Understandability:** A class with a single,
  clearly defined purpose is inherently easier for developers to
  understand. When a developer encounters a class named
  InvoiceRepository or EmailSender, its function is immediately
  apparent. This clarity reduces the cognitive load required to work
  with the code, speeding up both development of new features and
  debugging of existing ones.<sup>10</sup> Code that is easy to read is
  easy to reason about, and code that is easy to reason about is less
  prone to defects.

- **Increased Testability:** Testability is a direct consequence of
  reduced complexity. A small, focused class with a single
  responsibility and few dependencies is straightforward to test in
  isolation. Developers can easily instantiate the class, provide mock
  dependencies, and verify its behavior without needing to set up a
  complex and fragile test environment.<sup>13</sup> Indeed, difficulty
  in writing unit tests for a class is often a "code smell" that points
  directly to an SRP violation. If a test requires a dozen dependencies
  to be mocked or an elaborate sequence of setup steps, it is a strong
  signal that the class is doing too much.<sup>9</sup>

- **Higher Reusability:** Modules that are designed to do one thing well
  are far more likely to be reusable. A generic PdfGenerator class, for
  example, can be used anywhere in an application that needs to create a
  PDF. If that same class were also responsible for calculating invoice
  totals and saving them to a database, its reusability would be
  virtually zero.<sup>10</sup> By promoting the creation of small,
  focused, and decoupled components, SRP naturally leads to a reduction
  in duplicated code and a more efficient development
  process.<sup>12</sup>

These widely cited benefits—maintainability, testability, readability,
and reusability—are not independent outcomes. They are all secondary
effects of a single, primary benefit: the **reduction of cognitive
load**. An SRP-compliant class has a focused purpose, which makes its
role in the system immediately apparent to a developer. This drastically
lowers the mental effort required to understand its behavior, inputs,
and outputs. Because it is easy to understand, its readability is high.
Because its scope and dependencies are limited, setting it up for unit
testing is simple, thus improving its testability. Because a developer
can hold the entire context of the class in their mind with ease, they
can make changes with confidence, knowing they are less likely to cause
unintended side effects, which directly improves maintainability. This
causal chain—from focused purpose to reduced cognitive load to the
emergent properties of a well-designed system—reveals the fundamental
psychological root of SRP's effectiveness.

## The "Who": Unpacking the 'Single Reason to Change'

The conceptual leap from "one reason to change" to "one actor" is the
cornerstone of the modern interpretation of the Single Responsibility
Principle. This shift provides a concrete, actionable framework for
applying the principle by tying it directly to the human and
organizational context of the software. As Robert C. Martin emphatically
states, "the reasons for change are people".<sup>7</sup> Understanding
this is crucial for moving beyond a superficial application of SRP and
using it as a powerful tool for architectural design.

### The Actor as the Source of Change

An actor, in this context, is not necessarily a single user but a group
of users or stakeholders who share a common set of requirements and are
therefore a unified source of change requests.<sup>2</sup> For example,
the accounting department is an actor. The human resources department is
a different actor. The marketing team is a third actor.<sup>9</sup>
While an individual person might belong to multiple groups, their role
as an actor is defined by the function they represent. The principle
dictates that a software module should be designed to serve the needs of
only one of these actors.

### The Canonical Employee Class Example

To make this abstract concept concrete, Martin provides a canonical
example of an Employee class that violates the SRP.<sup>7</sup> Imagine
a simple Java class defined as follows:

> Java

public class Employee {  
public Money calculatePay();  
public String reportHours();  
public void save();  
}

On the surface, this class seems cohesive; all three methods are related
to the concept of an "employee." However, when viewed through the lens
of actors, the violation becomes clear. These three methods are
responsible to three completely different organizational departments,
each with its own set of requirements and motivations for change:

1.  **calculatePay():** The logic for calculating employee pay is
    specified by the accounting department. The Chief Financial Officer
    (CFO) and their team are the actors for this method. Changes to tax
    laws, payroll deductions, or payment schedules would originate from
    this group.

2.  **reportHours():** The format and content of the timesheet report
    are defined by the human resources or operations department. The
    Chief Operating Officer (COO) and their team are the actors for this
    method. Changes to how overtime is reported or how hours are
    aggregated for auditing purposes would come from this group.

3.  **save():** The mechanism for persisting employee data to a database
    is the concern of the database administrators and infrastructure
    team. The Chief Technology Officer (CTO) and their team are the
    actors for this method. Changes to the database schema, the choice
    of persistence framework, or data access protocols would be driven
    by this group.

Because these three methods serve three different actors, they have
three different reasons to change. Placing them in the same class
creates a dangerous coupling. A developer, responding to a request from
the CFO's team to modify the calculatePay method, might inadvertently
introduce a change that breaks the reportHours method. This would
disrupt the work of the COO's department, which did not request any
changes and has a reasonable expectation that its critical functions
will remain stable.<sup>7</sup>

### SRP as Organizational Risk Mitigation

This example reveals the true purpose of the Single Responsibility
Principle: it is a strategy for **managing organizational risk through
software architecture**. The problem it solves is not merely messy code,
but the very real business friction and conflict that arise when shared
code becomes a battleground for competing departmental priorities.

When a change requested by one actor breaks functionality critical to
another, trust between the business and the engineering team is eroded.
The COO, having been burned by a change from the CFO, will naturally
become resistant to *any* future changes to the Employee class, even
necessary ones, for fear of further disruption.<sup>7</sup> The shared
module becomes a source of organizational gridlock.

By applying SRP, the architect acts as a mediator of these business
concerns. Refactoring the Employee class into three distinct
classes—such as PayCalculator, HourReporter, and EmployeeRepository—is
not just a technical cleanup. It is an act of architectural diplomacy.
It creates software boundaries that mirror the organizational
boundaries. This ensures that a request from the finance department can
be implemented within the PayCalculator class without any risk of
impacting the HourReporter class. The "blast radius" of a change is
contained within the sphere of influence of the actor who requested
it.<sup>15</sup> This architectural separation prevents future
organizational conflict and allows different parts of the business to
evolve their software functions independently and safely.

## SRP in Practice: From Code Smells to Cohesive Design

Moving from the theoretical underpinnings of the Single Responsibility
Principle to its practical application requires the ability to identify
violations in existing code and the knowledge of refactoring techniques
to correct them. Certain patterns, or "code smells," often indicate that
a class has accumulated too many responsibilities. Recognizing these
smells is the first step toward creating a more robust and maintainable
design.

### Identifying SRP Violations (Code Smells)

Several common indicators can signal that a class or module may be
violating the SRP:

- **Large Classes and "God Classes":** A class with a very large number
  of methods or lines of code is a primary suspect. Over time, some
  classes tend to become "responsibility magnets," accumulating more and
  more unrelated functionality because it seems convenient to add "just
  one more method".<sup>14</sup> The  
  User class is a classic example in many applications, often growing to
  handle authentication, profile management, permissions, and more,
  turning it into a "God Class" that knows and does too
  much.<sup>14</sup>

- **Divergent Change:** This smell, described by Martin Fowler, occurs
  when one module is commonly changed in different ways for different
  reasons. If you find yourself frequently modifying a class for reasons
  that have no conceptual connection to each other (e.g., changing
  database logic one day and UI formatting the next), it is a clear sign
  that multiple responsibilities have been conflated.<sup>14</sup>

- **High Number of Dependencies:** A class that requires a large number
  of other objects to be injected into its constructor or passed to its
  methods may be trying to orchestrate too many disparate tasks. Each
  dependency often represents a distinct responsibility, and a class
  that juggles many of them is likely a coordinator of unrelated
  activities, violating SRP.<sup>9</sup>

- **Descriptive Naming Challenges:** A simple but effective heuristic is
  to try to describe what a class does in a single, concise sentence. If
  you find yourself using conjunctions like "and" or "or" in your
  description (e.g., "This class validates the input **and** saves it to
  the database **and** sends a confirmation email"), it is a strong
  indication that the class has more than one
  responsibility.<sup>10</sup>

### Refactoring Example 1: Separating Business Logic and Communication

A common violation involves mixing core business operations with
communication tasks like sending emails or notifications.

- **Violation:** Consider a SystemManager class responsible for both
  user administration and sending various types of
  messages.<sup>17</sup>  
  Kotlin  
  // Violation: SystemManager handles user management AND
  communication  
  class SystemManager {  
  fun addUser(user: User) { /\*... \*/ }  
  fun deleteUser(user: User) { /\*... \*/ }  
  fun sendNotification(notification: String) { /\*... \*/ }  
  fun sendEmail(user: User, email: String) { /\*... \*/ }  
  }

- **Actors:** The user management functions (addUser, deleteUser) are
  responsible to an "Administrator Actor" who manages the system's
  users. The communication functions (sendNotification, sendEmail) are
  responsible to a "User Communication Actor" or "Notification System
  Actor" who defines how and when users are contacted. These are
  distinct sources of change.

- **Refactoring:** The solution is to separate these responsibilities
  into distinct classes, each serving a single actor.  
  Kotlin  
  // Correction: Each class has a single responsibility  
  class UserManager {  
  fun addUser(user: User) { /\*... \*/ }  
  fun deleteUser(user: User) { /\*... \*/ }  
  }  
    
  class NotificationManager {  
  fun sendNotification(notification: String) { /\*... \*/ }  
  }  
    
  class MailManager {  
  fun sendEmail(user: User, email: String) { /\*... \*/ }  
  }  
    
  This refactoring results in a more modular design. A change in the
  email sending library will now only affect MailManager, leaving
  UserManager untouched.

### Refactoring Example 2: Separating Calculation and Presentation

Another frequent violation is the conflation of data processing with
data presentation.

- **Violation:** An AreaCalculator class that not only calculates the
  total area of a collection of geometric shapes but also formats the
  result for display, for example, in HTML.<sup>18</sup>  
  PHP  
  // Violation: AreaCalculator handles calculation AND presentation  
  class AreaCalculator {  
  protected \$shapes;  
  //... constructor...  
  public function sum() {  
  // Logic to calculate area of each shape and sum them  
  }  
  public function output() {  
  return "\<h1\>Sum of areas: ". \$this-\>sum(). "\</h1\>";  
  }  
  }

- **Actors:** The calculation logic (sum) is responsible to a "Business
  Rules Actor," who defines the mathematical formulas for area. The
  presentation logic (output) is responsible to a "UI/Reporting Actor,"
  who defines how results should be displayed to the user. A change in
  the mathematical formula should not require a change in the
  presentation, and vice versa.

- **Refactoring:** The refactoring occurs in two stages. First, the
  responsibility for calculating area is moved to each individual Shape
  class. Second, the responsibility for presentation is extracted into a
  new class.  
  PHP  
  // Stage 1: Shapes calculate their own area  
  interface Shape {  
  public function area();  
  }  
  class Square implements Shape {  
  //...  
  public function area() { return pow(\$this-\>length, 2); }  
  }  
  class Circle implements Shape {  
  //...  
  public function area() { return pi() \* pow(\$this-\>radius, 2); }  
  }  
    
  // Stage 2: Separate classes for calculation and presentation  
  class AreaCalculator {  
  protected \$shapes;  
  //... constructor...  
  public function sum() {  
  \$area =;  
  foreach (\$this-\>shapes as \$shape) {  
  \$area = \$shape-\>area();  
  }  
  return array_sum(\$area);  
  }  
  }  
    
  class SumCalculatorOutputter {  
  protected \$calculator;  
  //... constructor...  
  public function HTML() {  
  return "\<h1\>Sum of areas: ". \$this-\>calculator-\>sum().
  "\</h1\>";  
  }  
  public function JSON() {  
  return json_encode(\['sum' =\> \$this-\>calculator-\>sum()\]);  
  }  
  }  
    
  This design is vastly superior. The AreaCalculator now has a single
  responsibility: calculation. The SumCalculatorOutputter has a single
  responsibility: presentation. Adding a new shape (e.g., Triangle)
  requires no changes to either of these classes. Adding a new output
  format (e.g., XML) only requires a change to the
  SumCalculatorOutputter.

### Refactoring Example 3: Separating Persistence from Domain Logic

Domain objects should represent business concepts, not database
technology. Mixing these concerns is a common SRP violation.

- **Violation:** A Student class that contains properties and business
  logic related to a student, but also includes methods for saving
  itself to a database.<sup>19</sup>  
  C++  
  // Violation: Student class handles domain logic AND persistence  
  class Student {  
  private:  
  string name;  
  int age;  
  public:  
  //... getters and setters...  
  void saveToDatabase() {  
  // SQL connection and INSERT/UPDATE logic here...  
  }  
  };

- **Actors:** The properties and business rules of the Student are
  responsible to a "Domain Logic Actor" (e.g., a business analyst
  defining what constitutes a valid student). The persistence logic is
  responsible to a "Database Administrator Actor" or "Infrastructure
  Actor," who is concerned with database schemas, performance, and
  technology choices.

- **Refactoring:** The persistence logic should be extracted into a
  separate class, often following the Repository pattern.  
  C++  
  // Correction: Student class is focused on the domain  
  class Student {  
  private:  
  string name;  
  int age;  
  public:  
  //... getters and setters...  
  };  
    
  // New class to handle persistence  
  class StudentRepository {  
  private:  
  DatabaseConnector connector;  
  public:  
  void save(Student student) {  
  // Logic to save the student object using the connector  
  }  
  };  
    
  This separation decouples the business logic from the persistence
  mechanism. The Student class knows nothing about SQL or databases,
  making it more portable and easier to test. The StudentRepository
  encapsulates all database concerns, so a change from a SQL database to
  a NoSQL database would be isolated to this repository class.

The process of refactoring to comply with SRP is more than a mechanical
act of splitting code. It is a powerful form of **domain discovery and
clarification**. When starting with a monolithic class like
SystemManager, the concepts of "user management" and "communication" are
implicitly tangled. The act of refactoring forces the creation of new
classes, UserManager and NotificationManager, thereby giving these
concepts an explicit, first-class representation in the codebase. The
domain model becomes clearer and more aligned with the business reality.
Each time a class is split to satisfy SRP, it presents an opportunity to
ask, "What is the name of the new concept we have just discovered?" This
makes the resulting code not just more maintainable, but a more accurate
and expressive model of the problem it is solving.

## The Cohesion-Coupling Nexus: SRP's Role in Structural Integrity

The concepts of cohesion and coupling are foundational to software
design, representing two of the most important qualities of a
well-structured system. High cohesion and low coupling have been the
goals of software engineers for decades, as they are the primary drivers
of modularity, maintainability, and robustness.<sup>20</sup> The Single
Responsibility Principle does not exist in isolation from these
concepts; rather, it provides the most effective and practical mechanism
for achieving them. It serves as the bridge between the abstract desire
for a well-structured system and the concrete design decisions required
to build one.

### Defining Cohesion and Coupling

To understand SRP's role, it is essential to have precise definitions
for these two terms:

- **Cohesion:** This refers to the degree to which the elements *inside*
  a single module belong together.<sup>20</sup> It is a measure of the
  internal strength and relatedness of a module's components. In a
  highly cohesive module, all elements (e.g., methods and properties in
  a class) work together to achieve a single, well-defined purpose. Low
  cohesion results in "junk drawer" modules containing a mix of
  unrelated functionalities, making them difficult to understand and
  maintain.<sup>5</sup>

- **Coupling:** This refers to the degree of interdependence *between*
  different modules.<sup>5</sup> It is a measure of how much one module
  knows about or relies on another. In a system with high (or tight)
  coupling, a change in one module is likely to necessitate changes in
  many other modules. Low (or loose) coupling is the desired state,
  where modules are independent and interact through stable,
  well-defined interfaces, allowing them to be changed and deployed
  without impacting the rest of the system.<sup>21</sup>

### SRP as the Engine for High Cohesion

The Single Responsibility Principle provides the definitive criterion
for creating highly cohesive modules. While the general advice to
"increase cohesion" is sound, it can be too abstract to be actionable.
SRP makes it concrete. The alternative wording of the principle—"Gather
together the things that change for the same reasons. Separate those
things that change for different reasons"—is functionally a direct
instruction on how to achieve high cohesion.<sup>2</sup>

When a class is designed to be responsible to a single actor, all of its
methods and data will naturally be focused on serving the needs of that
actor. A PayCalculator class, responsible to the finance department,
will contain methods for calculating gross pay, deducting taxes, and
handling bonuses. All these elements are strongly related because they
are all part of the single, unified concern of employee compensation.
The class is, by definition, highly cohesive. SRP provides the "why" for
cohesion: elements are cohesive because they serve the same source of
change.

### High Cohesion as the Cause of Low Coupling

A powerful consequence of achieving high cohesion via SRP is that it
naturally leads to low coupling.<sup>5</sup> The two principles are two
sides of the same coin. The very act of grouping elements that change
for the same reason (increasing cohesion) necessitates the separation of
those elements from others that change for different reasons. This
separation is what creates the boundaries between modules, and these
boundaries are what reduce coupling.

Consider the Employee class example again. In its original form, it had
low cohesion because it mixed concerns from finance, operations, and
technology. It also created high coupling across the organization; the
finance department was coupled to the concerns of the operations
department through the shared class. By refactoring it into three
separate, highly cohesive classes (PayCalculator, HourReporter,
EmployeeRepository), the coupling between these concerns was severed.
The PayCalculator no longer has any dependency on or knowledge of the
HourReporter. A change in one cannot affect the other.

This demonstrates that software engineering has long advocated for "high
cohesion, low coupling," but these concepts remain descriptive qualities
of a system. They articulate *what* a good design looks like but do not
always provide a clear path on *how* to achieve it. The Single
Responsibility Principle, with its "actor" definition, provides the
missing prescriptive rule. It gives developers a concrete,
business-driven heuristic for making design decisions. An architect can
defend a class boundary not by subjectively stating, "This feels more
cohesive," but by objectively declaring, "This class serves the finance
department, and that class serves the operations department. They are
driven by different actors, change for different reasons, and therefore
must be separate." In this way, SRP acts as the critical bridge,
operationalizing the abstract architectural goals of high cohesion and
low coupling by tying them to the tangible structure of the business
domain.

## Navigating the Nuances: Common Misinterpretations and Criticisms

Despite its foundational importance, the Single Responsibility Principle
is perhaps the most misunderstood and misapplied of the SOLID
principles.<sup>22</sup> Its seemingly simple name and definition often
lead to dogmatic or overly simplistic applications that can harm a
codebase rather than help it. Acknowledging and understanding these
common misinterpretations, pitfalls, and valid criticisms is essential
for a pragmatic and effective application of the principle.

### Misinterpretation 1: "One Method Per Class"

The most pervasive misinterpretation of SRP is to equate "single
responsibility" with "does only one thing," which often devolves into an
extreme of "one method per class".<sup>16</sup> This misunderstanding
stems from a failure to grasp the "actor" definition and leads to an
anti-pattern known as anemic domain models, where classes are stripped
of all logic and become mere data containers. This approach results in
an explosion of tiny, fragmented classes that increase the overall
complexity of the system by scattering related logic across numerous
files.<sup>24</sup>

The correction to this misunderstanding is to remember that a single
responsibility—serving a single actor—will almost always require a
coordinated set of methods and data to fulfill its purpose. A
PayCalculator class, for instance, has the single responsibility of
calculating pay for the finance actor, but this may require multiple
methods (calculateGrossPay, applyTaxDeductions, calculateNetPay) that
work together cohesively.<sup>24</sup>

### Misinterpretation 2: Confusing SRP with Separation of Concerns (SoC)

Another common error is to use SRP and Separation of Concerns (SoC)
interchangeably, or to incorrectly apply SRP at an architectural level
where SoC is the more appropriate principle.<sup>6</sup> While SRP is a
form of SoC, they operate at different scales. SoC is a high-level
architectural principle concerned with dividing a system into broad,
distinct sections, such as the layers in a layered architecture (e.g.,
Presentation, Business Logic, Data Access) or the components of
MVC.<sup>26</sup> SRP, in contrast, is a class-level design principle
that provides a specific rule—alignment with a single actor—for how to
organize the code

*within* one of those layers or sections.<sup>23</sup> Conflating the
two leads to a loss of precision; they are related but distinct tools
for different levels of design.

### The Pitfall of Over-Engineering and "File Bloat"

A valid criticism of SRP is that its dogmatic application can lead to
over-engineering and unnecessary complexity. When developers split
classes prematurely based on hypothetical future changes, they can
create a system with an excessive number of classes and layers of
indirection.<sup>25</sup> This "file bloat" can make the codebase harder
to navigate and understand at a high level, as the logic for a single
conceptual feature becomes distributed across many small
files.<sup>28</sup> This is often a symptom of applying the "one thing"
misinterpretation rather than the "one actor" definition. If five
controller actions all serve the same web user actor, splitting them
into five separate controller classes based on a rigid interpretation of
SRP may be counterproductive, violating other principles like YAGNI (You
Ain't Gonna Need It).<sup>28</sup>

### The Ambiguity Criticism

Even with the refined "actor" definition, critics argue that identifying
distinct responsibilities and actors can be subjective and
ambiguous.<sup>29</sup> In many real-world scenarios, the lines between
business functions are blurry, and determining whether two change
requests come from the same or different actors is a matter of
judgment.<sup>15</sup> The principle does not provide a formulaic way to
define these boundaries; it relies on the developer's experience and
understanding of the domain. This ambiguity means that SRP is a
heuristic that guides design, not an algorithm that produces a single
correct answer.

### Tension with Other Principles: The "Tell, Don't Ask" Dilemma

Finally, applying SRP can sometimes create tension with other
established design principles, forcing developers to make pragmatic
trade-offs. A classic example is the conflict with the "Tell, Don't Ask"
principle, which advises that one should tell an object what to do
rather than asking it for its data and then acting on that data.

Consider a Purchase class that contains a charge method. This follows
"Tell, Don't Ask" because a client can simply tell the purchase to
charge itself. However, this violates SRP because the Purchase class is
now responsible for both purchase-related business rules and credit card
charging logic—two concerns that are likely to change for different
reasons.<sup>14</sup> To fix the SRP violation, one might extract the
charging logic into a

PurchaseProcessor class. However, the PurchaseProcessor would then need
to *ask* the Purchase object for its total amount to process the charge,
thus violating "Tell, Don't Ask." In such cases, there is no single
"right" answer, and the designer must weigh the benefits of SRP
(decoupling charging logic) against the benefits of "Tell, Don't Ask"
(better encapsulation) and make a context-dependent
decision.<sup>14</sup>

The majority of these criticisms and pitfalls are not inherent flaws in
the principle itself, but rather symptoms of applying its misinterpreted
"one thing" version instead of its intended "one actor" version. The
"actor" lens acts as a natural brake on over-engineering. If there is
not a distinct business group with a history of requesting divergent
changes for a piece of functionality, then there is not a separate
actor, and therefore no compelling reason to split the class. By
correctly teaching and applying the "one actor" definition, developers
can mitigate the principle's perceived drawbacks and use it as the
powerful, pragmatic design tool it was intended to be.

## SRP in the Broader Design Landscape: SoC, ISP, and the SOLID Family

The Single Responsibility Principle is a cornerstone of the SOLID
acronym, but its full value is realized when understood in context with
other design principles. It does not operate in isolation; rather, it
complements and interacts with other guidelines to form a holistic
approach to software design. Clarifying its relationship with closely
related concepts, particularly Separation of Concerns (SoC) and the
Interface Segregation Principle (ISP), is crucial for avoiding confusion
and applying each principle in its proper domain.

### SRP vs. Separation of Concerns (SoC): A Matter of Scale

As previously discussed, the most common point of confusion is the
relationship between SRP and SoC. The distinction is best understood as
a matter of scale and specificity.<sup>23</sup>

- **Separation of Concerns (SoC)** is a high-level, architectural
  principle. It guides the macro-level structure of an application,
  advocating for the division of the system into distinct, large-scale
  sections or layers. Examples include the three-tiered architecture
  (Presentation, Business, Data) or the Model-View-Controller pattern.
  The "concerns" in SoC are broad functional areas of the
  system.<sup>6</sup>

- **Single Responsibility Principle (SRP)** is a lower-level,
  class-design principle. It operates *within* the layers defined by
  SoC. It provides a specific, granular rule for organizing the classes
  and modules inside a single architectural layer. Its "responsibility"
  is tied to a specific actor, which is a much more focused concept than
  an architectural "concern".<sup>23</sup>

In essence, SoC tells you to build separate rooms in your house
(kitchen, bedroom, bathroom), while SRP tells you how to organize the
items *inside* one of those rooms (e.g., in the kitchen, keep all the
baking utensils together because they are used for the single purpose of
baking).

### SRP vs. Interface Segregation Principle (ISP): Provider vs. Consumer

The relationship between SRP and the Interface Segregation Principle
(ISP) is more nuanced, as both operate at a similar level of
granularity. The key difference lies in their perspective: SRP is
concerned with the implementation of a class (the provider), while ISP
is concerned with the needs of the code that uses that class (the
consumer).<sup>30</sup>

- **Single Responsibility Principle (SRP)** focuses on the **provider's
  perspective**. It dictates that the implementer of a class should
  structure it around a single, cohesive responsibility, defined by a
  single actor. Its goal is to ensure the class itself is robust and
  easy to maintain. It is a designer-side view.<sup>30</sup>

- **Interface Segregation Principle (ISP)** focuses on the **consumer's
  perspective**. It states that "clients should not be forced to depend
  on methods they do not use." Its goal is to decouple clients from
  parts of an interface they don't need, preventing them from being
  affected by changes to methods they don't call. It is a client-side
  view.<sup>30</sup>

A class can satisfy SRP yet still violate ISP. Robert C. Martin
illustrates this with the example of a Stack class that has both push
and pop methods. This class arguably has a single responsibility:
managing a last-in, first-out collection of items. It serves a single
conceptual purpose and would likely be driven by a single actor. Thus,
it satisfies SRP. However, imagine a client that only ever needs to
*push* items onto the stack and never needs to *pop* them. By depending
on the full Stack interface, this client is forced into a dependency on
the pop method, which it does not use. This violates ISP. A change to
the pop method could force this push-only client to be recompiled or
retested unnecessarily. The ISP solution would be to create smaller,
role-based interfaces, such as Pushable and Poppable, that the Stack
class can implement.

The following table crystallizes the distinctions between these
often-conflated principles.

| Dimension | Single Responsibility Principle (SRP) | Separation of Concerns (SoC) | Interface Segregation Principle (ISP) |
|----|----|----|----|
| **Focus** | The "actor" or source of change that a module serves. | The distinct functional areas of a system. | The needs of the client consuming an interface. |
| **Scope** | Class / Module Level | Architectural / System Level | Interface Level |
| **Guiding Question** | "Who is this code responsible to?" | "How can we divide the system into logical parts?" | "What methods does this specific client need?" |
| **Primary Goal** | High Cohesion (grouping by actor). | Modularity and organization. | Low Coupling (decoupling clients from unused methods). |

Ultimately, SRP and ISP are complementary principles that work together
to manage change effectively. SRP manages change originating from the
source (the actor), while ISP manages the impact of change on the
destination (the client). A robust design requires attention to both the
internal cohesion of its components and the precise definition of its
external contracts.

## Architectural Implications: Applying SRP at Scale

While the Single Responsibility Principle is formally defined at the
level of a class or module, its underlying logic—aligning software
boundaries with the axes of change—is a powerful concept that scales
across all levels of software abstraction. It is a fractal principle
whose wisdom applies equally to the design of a single function, a
complex class, a user interface component, a microservice, or an entire
system architecture. Understanding how to apply SRP at these different
scales is a hallmark of architectural maturity.

### SRP in Microservices Architecture

The modern trend toward microservices architecture is, in many ways, the
architectural embodiment of the Single Responsibility Principle. The
core idea of microservices is to structure an application as a
collection of small, autonomous services, where each service is
organized around a specific business capability.<sup>31</sup>

This "decomposition by business capability" is precisely SRP applied at
the service level. A microservice like a "Payment Service" is designed
to be responsible to a single business actor or department (e.g., the
finance department). An "Order Management Service" is responsible to
another (e.g., the logistics and fulfillment department).<sup>31</sup>
This alignment ensures that each service has a single, well-defined
reason to change. The benefits mirror those of SRP at the class level
but are magnified at the architectural scale:

- **Independent Development and Deployment:** Teams can work on their
  respective services autonomously, without creating bottlenecks or
  interfering with one another.<sup>31</sup>

- **Improved Fault Isolation:** A failure in one service is less likely
  to cascade and bring down the entire application.<sup>33</sup>

- **Technology Heterogeneity:** Each team can choose the best technology
  stack for its specific service.

Conversely, violating SRP at this level leads to the creation of a
"distributed monolith"—a system that has the network latency and
operational complexity of microservices but lacks their key benefit of
independent deployability because services are too tightly coupled and
lack a single, clear responsibility.

### SRP in Serverless Functions (e.g., AWS Lambda)

In serverless architectures, the unit of deployment is the function
(e.g., an AWS Lambda function). The question of how to apply SRP at this
level involves significant trade-offs between design purity and
practical performance considerations.

- **Single-Purpose Functions:** This is the purest application of SRP,
  where each function is designed to perform one specific, granular
  task, such as createNewUser, updateUserProfile, or
  processPayment.<sup>34</sup> This approach offers maximum isolation,
  granular security permissions, and the ability to optimize resources
  (memory, timeout) for each specific task. However, it can lead to a
  proliferation of functions, making the overall system complex to
  manage, and can increase the frequency of "cold starts," where a
  function must be initialized before it can execute, adding
  latency.<sup>36</sup>

- **"Lambda-liths":** This approach bundles multiple related operations
  into a single function. For example, a single UserApiHandler function
  might handle all CRUD (Create, Read, Update, Delete) operations for a
  user resource, using an internal dispatcher to route the request based
  on the HTTP method.<sup>36</sup> This improves code cohesion, reduces
  the number of cold starts for less-frequently used operations, and
  simplifies deployment. However, it sacrifices granular configuration
  and can violate SRP if the different operations (e.g., a user reading
  their own profile vs. an admin deleting a user) are actually
  responsible to different actors with different security and
  performance requirements.<sup>36</sup>

- **Hybrid Approaches:** Pragmatic designs often find a middle ground. A
  common pattern is to split functions based on read vs. write
  operations. A ReadUserFunction might handle all GET requests, while a
  WriteUserFunction handles POST, PUT, and DELETE. This provides some of
  the cohesion benefits of the Lambda-lith while allowing for
  independent scaling and optimization of the often-disparate read and
  write paths. This approach can also be a stepping stone to a full
  Command Query Responsibility Segregation (CQRS) pattern.<sup>36</sup>

The choice between these strategies is a critical architectural decision
in serverless design, requiring a careful balance of competing concerns.

| Approach | Description | Benefits (Pros) | Issues (Cons) |
|----|----|----|----|
| **Single Responsibility** | One Lambda function per specific task/event. | Strong separation of concerns, granular configuration, better debuggability, potentially faster execution time. | Code duplication, complex maintenance, higher number of cold start invocations. |
| **Lambda-lith** | One Lambda function for an entire API or multiple related tasks. | Fewer cold starts, higher code cohesion, simpler maintenance of shared configurations. | Coarse-grained configuration, potentially higher cold start *time*, larger package size. |
| **Read/Write Split** | Separate functions for read operations (GET) and write operations (POST, PUT, DELETE). | Code cohesion where needed, optimizes read/write paths independently, evolutionary architecture. | Can introduce eventual consistency (if using CQRS), potentially more complex data models. |

### SRP in Component-Based UI Frameworks (e.g., React)

The Single Responsibility Principle is also highly relevant in modern
frontend development, particularly in component-based frameworks like
React. A UI component should have a single, well-defined
responsibility.<sup>38</sup> Violating this leads to "God components"
that become bloated, difficult to test, and impossible to reuse.

Responsibilities in a UI context can include:

- **Presentational Responsibility:** Rendering a piece of UI based on
  props (e.g., a Button or UserProfileCard component).

- **State Management Responsibility:** Managing a complex piece of
  application state.

- **Data Fetching Responsibility:** Interacting with an API to fetch or
  submit data.

- **Business Logic Responsibility:** Encapsulating a specific piece of
  application logic.

A common pattern for applying SRP in React is the separation of
container and presentational components. A **container component** is
responsible for the "how things work" (fetching data, managing state),
while a **presentational component** is responsible for the "how things
look" (rendering HTML and styles based on the data passed down as
props).<sup>39</sup> This separation makes components more reusable,
easier to test (presentational components can be tested without APIs),
and simpler to reason about.

This analysis reveals that SRP is a **fractal principle of boundary
definition**. The core logic—identifying the distinct "reasons to
change" (actors, business capabilities, UI concerns) and drawing a
boundary around the code that serves each one—is the same whether one is
deciding the placement of a method, the structure of a class, the scope
of a microservice, or the design of a UI component. Mastering SRP at the
class level provides the fundamental mental model needed to reason
effectively about architectural decomposition at every level of a
software system.

## A Pragmatic Approach: Balancing Purity with Practicality

The Single Responsibility Principle, like all powerful tools, requires
skill and judgment in its application. A dogmatic, unthinking adherence
to the principle can lead to overly complex and fragmented designs,
while ignoring it entirely results in monolithic, unmaintainable code.
The mark of an expert engineer is not the ability to recite the
definition of SRP, but the wisdom to know when, where, and how deeply to
apply it to achieve a design that is practical, robust, and elegant.

### SRP as a Guideline, Not a Dogma

It is crucial to remember that design principles are guidelines, not
immutable laws.<sup>28</sup> The ultimate goal of software design is to
produce a system that meets its functional and non-functional
requirements while being economical to maintain and evolve over its
lifetime. SRP is a means to that end, not an end in itself. There are
times when a pragmatic deviation from a strict interpretation of the
principle may lead to a simpler and more effective overall design. The
cost of creating additional classes and layers of abstraction must be
weighed against the anticipated benefit of increased modularity.

### The Economic Decision: The Axis of Change Corollary

Robert C. Martin provided a critical piece of guidance for this
balancing act, which he called a corollary to the principle: **"An axis
of change is only an axis of change if the changes actually
occur"**.<sup>29</sup> This is a profound statement that grounds the
application of SRP in economic reality. It is unwise to apply SRP based
on purely hypothetical or speculative future changes. The cost of
abstraction is paid upfront in development time and complexity, while
the benefit is only realized if the anticipated change actually
materializes.

If two responsibilities are currently stable and have historically
changed together in lockstep, separating them prematurely based on a
theoretical possibility that they *might* diverge in the future is often
a form of over-engineering. The pragmatic approach is to apply the
principle most rigorously where there is clear evidence of divergent
change or a high probability of it based on the business context.

### A Framework for Application

To apply SRP with the necessary nuance and judgment, developers and
architects can use a simple decision-making framework:

1.  **Identify the Actors:** For any given module, explicitly identify
    and list the distinct user groups, stakeholders, or business
    functions that drive its requirements. If you cannot clearly name
    more than one actor, the module likely already adheres to SRP.

2.  **Assess the Volatility and Divergence:** For each identified actor,
    assess the likelihood and frequency of change requests. Are their
    needs stable and historically aligned, or are they volatile and
    likely to diverge? Look for evidence in past feature requests and
    project roadmaps. A history of divergent change is the strongest
    possible signal that a separation is needed.

3.  **Apply Proportionally:** Apply SRP most rigorously where the actors
    are clearly distinct and their requirements are volatile or have a
    demonstrated history of divergence. Be more lenient and favor
    simplicity where a single actor is dominant, or where multiple
    actors have needs that are stable and well-aligned.

### Conclusion: SRP and Engineering Judgment

The Single Responsibility Principle is one of the most powerful concepts
in a software designer's toolkit. When understood correctly—as a
principle of aligning software modules with the human actors they
serve—it provides a clear and effective heuristic for creating highly
cohesive, loosely coupled systems that are resilient to change. It
elevates the conversation from abstract qualities like "good design" to
concrete discussions about organizational structure and business risk.

However, its power comes with the need for careful application. The true
value of the principle is not in creating the maximum number of
single-purpose classes, but in making deliberate, informed decisions
about where to draw the boundaries in a system. It is a principle that
sharpens, rather than replaces, the seasoned judgment that is the
hallmark of a professional software engineer.<sup>15</sup> By balancing
the pursuit of design purity with the practical realities of the project
and its organizational context, we can use SRP to build software that is
not just technically sound, but truly built to last.

#### Works cited

1.  thoughtbot.com, accessed August 22, 2025,
    [<u>https://thoughtbot.com/ruby-science/single-responsibility-principle.html#:~:text=The%20Single%20Responsibility%20Principle%2C%20often,understand%20and%20faster%20to%20test.</u>](https://thoughtbot.com/ruby-science/single-responsibility-principle.html#:~:text=The%20Single%20Responsibility%20Principle%2C%20often,understand%20and%20faster%20to%20test.)

2.  Single-responsibility principle - Wikipedia, accessed August 22,
    2025,
    [<u>https://en.wikipedia.org/wiki/Single-responsibility_principle</u>](https://en.wikipedia.org/wiki/Single-responsibility_principle)

3.  Secrets of the Single Responsibility Principle - Development Simply
    Put, accessed August 22, 2025,
    [<u>https://www.developmentsimplyput.com/post/secrets-of-the-single-responsibility-principle</u>](https://www.developmentsimplyput.com/post/secrets-of-the-single-responsibility-principle)

4.  The Single Responsibility Principle Revisited - The Valuable Dev,
    accessed August 22, 2025,
    [<u>https://thevaluable.dev/single-responsibility-principle-revisited/</u>](https://thevaluable.dev/single-responsibility-principle-revisited/)

5.  Difference Between Cohesion and Coupling \| Baeldung on Computer
    Science, accessed August 22, 2025,
    [<u>https://www.baeldung.com/cs/cohesion-vs-coupling</u>](https://www.baeldung.com/cs/cohesion-vs-coupling)

6.  Single responsibility and Separation of concerns principles \[Real
    use cases\], accessed August 22, 2025,
    [<u>https://developer.onepagecrm.com/blog/single-responsibility-and-separation-of-concerns-principles/</u>](https://developer.onepagecrm.com/blog/single-responsibility-and-separation-of-concerns-principles/)

7.  Uncle Bob - The Single Responsibility Principle - Clean Coder Blog,
    accessed August 22, 2025,
    [<u>https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html</u>](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html)

8.  Serverless: Focusing on Actors and their Activities \| by John
    Gilbert \| Medium, accessed August 22, 2025,
    [<u>https://medium.com/@jgilbert001/serverless-focusing-on-actors-and-their-activities-90eb9cefcd46</u>](https://medium.com/@jgilbert001/serverless-focusing-on-actors-and-their-activities-90eb9cefcd46)

9.  Single Responsibility Principle. What code smells indicate that a
    class is doing too much?, accessed August 22, 2025,
    [<u>https://www.reddit.com/r/learnprogramming/comments/sz9he0/single_responsibility_principle_what_code_smells/</u>](https://www.reddit.com/r/learnprogramming/comments/sz9he0/single_responsibility_principle_what_code_smells/)

10. Benefits of the Single Responsibility Principle \| by Andrew ... -
    Medium, accessed August 22, 2025,
    [<u>https://medium.com/@a.vathanaka/benefits-of-writing-code-that-adheres-to-the-single-responsibility-principle-54e8ef1d7e30</u>](https://medium.com/@a.vathanaka/benefits-of-writing-code-that-adheres-to-the-single-responsibility-principle-54e8ef1d7e30)

11. Applying SRP for Better Software Design - Number Analytics, accessed
    August 22, 2025,
    [<u>https://www.numberanalytics.com/blog/applying-srp-better-software-design</u>](https://www.numberanalytics.com/blog/applying-srp-better-software-design)

12. SOLID: Learn About the Single Responsibility Principle With Examples
    \| HackerNoon, accessed August 22, 2025,
    [<u>https://hackernoon.com/solid-learn-about-the-single-responsibility-principle-with-examples</u>](https://hackernoon.com/solid-learn-about-the-single-responsibility-principle-with-examples)

13. SOLID: Single Responsibility Principle(SRP) in C# - DEV Community,
    accessed August 22, 2025,
    [<u>https://dev.to/extinctsion/solid-single-responsibility-principlesrp-in-c-34d7</u>](https://dev.to/extinctsion/solid-single-responsibility-principlesrp-in-c-34d7)

14. Single Responsibility Principle - Ruby Science by thoughtbot,
    accessed August 22, 2025,
    [<u>https://thoughtbot.com/ruby-science/single-responsibility-principle.html</u>](https://thoughtbot.com/ruby-science/single-responsibility-principle.html)

15. architecture - When using the Single Responsibility Principle, what
    ..., accessed August 22, 2025,
    [<u>https://softwareengineering.stackexchange.com/questions/345018/when-using-the-single-responsibility-principle-what-constitutes-a-responsibili</u>](https://softwareengineering.stackexchange.com/questions/345018/when-using-the-single-responsibility-principle-what-constitutes-a-responsibili)

16. SOLID series: Single Responsibility Principle (SRP) - LogRocket
    Blog, accessed August 22, 2025,
    [<u>https://blog.logrocket.com/single-responsibility-principle-srp/</u>](https://blog.logrocket.com/single-responsibility-principle-srp/)

17. Solid Principles with Violation and Correction Code \| by Amit ...,
    accessed August 22, 2025,
    [<u>https://blog.stackademic.com/solid-principles-with-violation-and-correction-code-a6fa9cefbda8</u>](https://blog.stackademic.com/solid-principles-with-violation-and-correction-code-a6fa9cefbda8)

18. SOLID Design Principles Explained: Building Better Software ...,
    accessed August 22, 2025,
    [<u>https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design</u>](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)

19. What is Single Responsibility Principle? - Naukri Code 360, accessed
    August 22, 2025,
    [<u>https://www.naukri.com/code360/library/what-is-single-responsibility-principle</u>](https://www.naukri.com/code360/library/what-is-single-responsibility-principle)

20. How Cohesion and Coupling Correlate - Tomas Tulka's Blog, accessed
    August 22, 2025,
    [<u>https://blog.ttulka.com/how-cohesion-and-coupling-correlate/</u>](https://blog.ttulka.com/how-cohesion-and-coupling-correlate/)

21. Cohesion and Coupling: the difference - Enterprise Craftsmanship,
    accessed August 22, 2025,
    [<u>https://enterprisecraftsmanship.com/posts/cohesion-coupling-difference/</u>](https://enterprisecraftsmanship.com/posts/cohesion-coupling-difference/)

22. Does Single Responsibility Principle Lead to Bad Architecture? -
    Quality Coding, accessed August 22, 2025,
    [<u>https://qualitycoding.org/single-responsibility-principle/</u>](https://qualitycoding.org/single-responsibility-principle/)

23. The SRP is not SoC – Raimund Krämer, accessed August 22, 2025,
    [<u>https://raimund-kraemer.dev/2023/11/04/the-srp-is-not-soc/</u>](https://raimund-kraemer.dev/2023/11/04/the-srp-is-not-soc/)

24. Does this class design violate the single responsibility principle?,
    accessed August 22, 2025,
    [<u>https://softwareengineering.stackexchange.com/questions/306801/does-this-class-design-violate-the-single-responsibility-principle</u>](https://softwareengineering.stackexchange.com/questions/306801/does-this-class-design-violate-the-single-responsibility-principle)

25. Single Responsibility Principle: Strengths and Weaknesses - Gopi
    Gorantala, accessed August 22, 2025,
    [<u>https://www.ggorantala.dev/srp-advantages-and-disadvantages/</u>](https://www.ggorantala.dev/srp-advantages-and-disadvantages/)

26. Difference between Concern and Responsibility ( ie difference
    between SRP and SoC )?, accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/12886291/difference-between-concern-and-responsibility-ie-difference-between-srp-and-so</u>](https://stackoverflow.com/questions/12886291/difference-between-concern-and-responsibility-ie-difference-between-srp-and-so)

27. Single Responsibility vs Separation of Concerns - DEV Community,
    accessed August 22, 2025,
    [<u>https://dev.to/yani82/single-responsibility-vs-separation-of-concerns-5amh</u>](https://dev.to/yani82/single-responsibility-vs-separation-of-concerns-5amh)

28. Please explain why we need SRP in "Plain English" despite its
    drawbacks?, accessed August 22, 2025,
    [<u>https://softwareengineering.stackexchange.com/questions/360398/please-explain-why-we-need-srp-in-plain-english-despite-its-drawbacks</u>](https://softwareengineering.stackexchange.com/questions/360398/please-explain-why-we-need-srp-in-plain-english-despite-its-drawbacks)

29. I don't love the single responsibility principle - Marco Cecconi,
    accessed August 22, 2025,
    [<u>https://sklivvz.com/posts/i-dont-love-the-single-responsibility-principle</u>](https://sklivvz.com/posts/i-dont-love-the-single-responsibility-principle)

30. oop - In SOLID, what is the distinction between SRP and ISP ...,
    accessed August 22, 2025,
    [<u>https://stackoverflow.com/questions/14388358/in-solid-what-is-the-distinction-between-srp-and-isp-single-responsibility-pr</u>](https://stackoverflow.com/questions/14388358/in-solid-what-is-the-distinction-between-srp-and-isp-single-responsibility-pr)

31. 13 Microservices Best Practices - Oso, accessed August 22, 2025,
    [<u>https://www.osohq.com/learn/microservices-best-practices</u>](https://www.osohq.com/learn/microservices-best-practices)

32. Pattern: Decompose by business capability - Microservices.io,
    accessed August 22, 2025,
    [<u>https://microservices.io/patterns/decomposition/decompose-by-business-capability.html</u>](https://microservices.io/patterns/decomposition/decompose-by-business-capability.html)

33. Principles for Designing Scalable Microservices - The Code Blogger,
    accessed August 22, 2025,
    [<u>https://thecodeblogger.com/2025/03/07/principles-for-designing-scalable-microservices/</u>](https://thecodeblogger.com/2025/03/07/principles-for-designing-scalable-microservices/)

34. Single Responsibility Principle in AWS Lambda: A Practical Guide \|
    Sergii Grytsaienko, accessed August 22, 2025,
    [<u>https://sgryt.com/posts/single-responsibility-principle-in-lambda/</u>](https://sgryt.com/posts/single-responsibility-principle-in-lambda/)

35. Five Essential Principles for Developing Lambdas \| by KonfHub -
    Medium, accessed August 22, 2025,
    [<u>https://konfhub.medium.com/five-essential-principles-for-developing-lambdas-2a93bf04dbd1</u>](https://konfhub.medium.com/five-essential-principles-for-developing-lambdas-2a93bf04dbd1)

36. Comparing design approaches for building serverless microservices
    ..., accessed August 22, 2025,
    [<u>https://aws.amazon.com/blogs/compute/comparing-design-approaches-for-building-serverless-microservices/</u>](https://aws.amazon.com/blogs/compute/comparing-design-approaches-for-building-serverless-microservices/)

37. AWS Lambda – Lean Single Purpose or Monolithic Function - Serverless
    Life, accessed August 22, 2025,
    [<u>https://www.serverlesslife.com/AWS_Lambda_Lean_Single_Purpose_or_Monolithic_Function.html</u>](https://www.serverlesslife.com/AWS_Lambda_Lean_Single_Purpose_or_Monolithic_Function.html)

38. Understanding the Single Responsibility Principle (SRP) in React \|
    by Ayomitunde I., accessed August 22, 2025,
    [<u>https://medium.com/@ayomitunde.isijola/understanding-the-single-responsibility-principle-srp-in-react-3f3defb37262</u>](https://medium.com/@ayomitunde.isijola/understanding-the-single-responsibility-principle-srp-in-react-3f3defb37262)

39. Applying the Single Responsibility Principle to React App - DhiWise,
    accessed August 22, 2025,
    [<u>https://www.dhiwise.com/post/building-react-apps-with-the-single-responsibility-principle</u>](https://www.dhiwise.com/post/building-react-apps-with-the-single-responsibility-principle)

40. What Is the Single Responsibility Principle (SRP) \| LambdaTest,
    accessed August 22, 2025,
    [<u>https://www.lambdatest.com/blog/single-responsibility-principle/</u>](https://www.lambdatest.com/blog/single-responsibility-principle/)
