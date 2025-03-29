
![[Birds Eye Workflow.canvas]]

![[Birds Eye Overview.canvas]]
#### Process Elements

- [[Components/Editor|Editor]] ==> [[Core/Compile|Compile]] ==>  [[DataTypes/Statement Block|Statement Block]] ==> [[Core/Runtime|Runtime]] ==> RuntimeResult ==> 
- [[DataTypes/Runtime Block|Runtime Block]]
- [[Core/Metric Calculator|Metric Calculator]]
- [[Components/Results Table|Results Table]]
- [[Components/Data Store|Data Store]]

Important Data Types

-
- [[DataTypes/Result Block|Result Block]]



Runtime -> tick();

tick()
	- Runtime().Tick == Events[]
	- PendingStack[]  + Events[] -> Actions[]
	-  runtime.apply(Actions) => PendingStact[]
