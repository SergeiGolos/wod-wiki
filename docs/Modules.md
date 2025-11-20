
---
What I need to do is break up the existing application into manageable modules that I can reason about that have explicit interfaces that enable the communication that exists today between these components.

- Core shared interfaces.
- Parser (all the stuff associated with parsing including the chevrotain)
- WodWikiEditor (the manaco editor with all)
- The index view
- the editable /readonly syntax view
- the runtime synstax view  which builds activly builds the gittree view.
- the completed syntax log / timeline using a gittree flow to display the units of work being done.  (prototype in html document)  
- effort-repository to look up unit excelsis or trackables units other like sleep or fasting 
- workout-repository that allows for re-write data access to workouts by id and stores the md or json data attached.


The goal is to maintain the existing storybook and have it work the same way it work now but allow it to be build out from these components having a storybook based workbench component that componse everything into the story. 

---

in a story i should be able to define 
- the markdown text
- what command palate item provider are available in the story

---

- reorganize and namespace the files in the solution (make sure not to break the file linkings in the process.)
- create an npm package from those moduiles allowing npm run build to generate the package to deploy to npm.
- make sure we can still npm run build-storybook as well and that works correctly. with the existing stories.


----

Views In WodWorkbench

Initial
- Left 2 / 3 screen editor
- Right 1 / 3 post at a galance index page
- when a user select the wod block in the index page or by clicking into a wod blockk diplsay the edit view with the syntax view.  (this enables the runtime button too alloing the to start runtime view)
Runtime View
- left 1/3 screen the syntax display and the new git view building above it as the rutnime creates logs to display.
- right 2/3 screent he trimer..  (Debug button top right to slide open the debug view that displays the stack and heap for the current runtime. )
  
Analytics View
- 1/3 screen the git view of the collected segments 
- the table display and potentially graphs.  that we used in the initial poc html page  



- Core shared interfaces.
- Parser (all the stuff associated with parsing including the chevrotain)
- WodWikiEditor (the manaco editor with all)
- The index view
- the editable /readonly syntax view
- the runtime synstax view  which builds activly builds the gittree view.
- the completed syntax log / timeline using a gittree flow to display the units of work being done.  (prototype in html document)  
- effort-repository to look up unit excelsis or trackables units other like sleep or fasting 
- workout-repository that allows for re-write data access to workouts by id and stores the md or json data attached.
 
