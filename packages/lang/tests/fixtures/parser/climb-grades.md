---
title: "Climb dialect grades and send types"
sport: climb
---

## Script

```wod
v5 flash
5.12a redpoint
```

## Expected

### Line 1
- Effort "v5 flash" @parser
- ClimbGrade raw:V5 system:v-scale @dialect
- ClimbSendType "flash" @dialect
- ClimbDiscipline "bouldering" @dialect
- Hint domain.climb @dialect
- Hint behavior.route_based @dialect
- Hint behavior.grade_based @dialect
- Hint climb.bouldering @dialect

### Line 2
- Rep 5.12 @parser
- Effort "a redpoint" @parser
- ClimbGrade raw:5.12a system:yds @dialect
- ClimbSendType "redpoint" @dialect
- ClimbDiscipline "sport" @dialect
- Hint domain.climb @dialect
- Hint behavior.route_based @dialect
- Hint behavior.grade_based @dialect
- Hint climb.sport @dialect
