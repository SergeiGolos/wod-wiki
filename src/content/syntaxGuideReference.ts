import basicEmomGuide from '../../markdown/canvas/syntax/basic-emom.md?raw'
import classicAmrapGuide from '../../markdown/canvas/syntax/classic-amrap.md?raw'
import complexNestedProtocolsGuide from '../../markdown/canvas/syntax/complex-nested-protocols.md?raw'
import coreRulesGuide from '../../markdown/canvas/syntax/core-rules.md?raw'
import groups1Guide from '../../markdown/canvas/syntax/groups-1.md?raw'
import groups2Guide from '../../markdown/canvas/syntax/groups-2.md?raw'
import measurementsGuide from '../../markdown/canvas/syntax/measurements.md?raw'
import mixedSectionsGuide from '../../markdown/canvas/syntax/mixed-sections.md?raw'
import protocols4Guide from '../../markdown/canvas/syntax/protocols-4.md?raw'
import timerModifiersGuide from '../../markdown/canvas/syntax/timer-modifiers.md?raw'
import timersRestGuide from '../../markdown/canvas/syntax/timers-rest.md?raw'

export interface SyntaxGuideReference {
  title: string
  subtitle: string
  docsPath: string
  workout: string
  storyContent: string
}

function readFrontmatterField(markdown: string, field: string) {
  const match = markdown.match(new RegExp(`^${field}:\\s*"([^"]+)"`, 'm'))

  if (!match?.[1]) {
    throw new Error(`Guide example is missing frontmatter field: ${field}`)
  }

  return match[1]
}

function extractWorkout(markdown: string) {
  const match = markdown.match(/```wod\n([\s\S]*?)\n```/)

  if (!match) {
    throw new Error('Guide example is missing a ```wod fenced block.')
  }

  return match[1]
}

function createReference(markdown: string, docsPath: string): SyntaxGuideReference {
  const title = readFrontmatterField(markdown, 'title')
  const subtitle = readFrontmatterField(markdown, 'subtitle')
  const workout = extractWorkout(markdown)

  return {
    title,
    subtitle,
    docsPath,
    workout,
    storyContent: ['# ' + title, '', subtitle, '', '```wod', workout, '```'].join('\n'),
  }
}

export const syntaxGuideReference = {
  coreRules: createReference(coreRulesGuide, '/guide/syntax/basics'),
  measurements: createReference(measurementsGuide, '/guide/syntax/basics?h=measurements'),
  timerModifiers: createReference(timerModifiersGuide, '/guide/syntax/basics?h=timer-modifiers'),
  simpleRounds: createReference(groups1Guide, '/guide/syntax/structure?h=simple-rounds'),
  repSchemes: createReference(groups2Guide, '/guide/syntax/structure?h=rep-schemes'),
  timersAndRest: createReference(timersRestGuide, '/guide/syntax/protocols?h=timers-and-rest'),
  classicAmrap: createReference(classicAmrapGuide, '/guide/syntax/protocols?h=classic-amrap'),
  basicEmom: createReference(basicEmomGuide, '/guide/syntax/protocols?h=basic-emom'),
  standardTabata: createReference(protocols4Guide, '/guide/syntax/protocols?h=standard-tabata'),
  mixedSections: createReference(mixedSectionsGuide, '/guide/syntax/structure?h=mixed-sections'),
  complexNestedProtocols: createReference(complexNestedProtocolsGuide, '/guide/syntax/complex?h=nested-protocols'),
} as const
