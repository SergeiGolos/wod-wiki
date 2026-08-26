---
title: "Trailing comments and custom metric objects"
---

## Script

```wod
10 Back Squat 225lb // last set heavy
5 Back Squat 225lb {"intensity": 80, "rpe": 8}
```

## Expected

### Line 1
- Rep 10 @parser
- Effort "Back Squat" @parser
- Resistance 225 lb @parser
- Text text:"last set heavy" @parser

### Line 2
- Rep 5 @parser
- Effort "Back Squat" @parser
- Resistance 225 lb @parser
- Intensity 80 @parser
- SessionRpe 8 @parser
