import { Project, SyntaxKind, PropertyAssignment, ObjectLiteralExpression, PropertyAccessExpression } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

// We only care about src/ because there might be other places like node_modules we don't want to touch.
const sourceFiles = project.getSourceFiles('src/**/*.{ts,tsx}');

let modifiedCount = 0;

const behaviorMap: Record<string, string> = {
  'Defined': 'parser',
  'Hint': 'hinted',
  'Collected': 'collected',
  'Recorded': 'tracked',
  'Calculated': 'analyzed',
};

sourceFiles.forEach(sourceFile => {
  let fileModified = false;

  // 1. Handle PropertyAccessExpressions: `.metricType` -> `.type`, `.behavior` -> `.origin`, `MetricBehavior.X` -> `'x'`
  const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
  propAccesses.forEach(prop => {
    const nameNode = prop.getNameNode();
    const name = nameNode.getText();

    if (name === 'metricType') {
      try { nameNode.replaceWithText('type'); fileModified = true; } catch (e) {}
    } else if (name === 'behavior') {
      // Be careful: only replace if it looks like it belongs to a metric, 
      // but usually property accesses for `behavior` in this codebase refer to MetricBehavior.
      // So we replace `.behavior` with `.origin`.
      // Also we need to ignore things like `MetricBehavior.Defined` where the name might be 'Defined'.
      // Wait, if it's `MetricBehavior.Defined`, the name is 'Defined', and the expression is 'MetricBehavior'.
      // So `.behavior` applies to something else. Let's assume it's Metric property.
      try { nameNode.replaceWithText('origin'); fileModified = true; } catch (e) {}
    }

    // Handle `MetricBehavior.X`
    const expressionName = prop.getExpression().getText();
    if (expressionName === 'MetricBehavior') {
      const mapped = behaviorMap[name];
      if (mapped) {
        try { prop.replaceWithText(`'${mapped}'`); fileModified = true; } catch (e) {}
      }
    }
  });

  // 2. Handle Object Literals that have `metricType` or `behavior`
  const objLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
  objLiterals.forEach(obj => {
    const metricTypeProp = obj.getProperty('metricType');
    const typeProp = obj.getProperty('type');
    const behaviorProp = obj.getProperty('behavior');

    if (metricTypeProp && metricTypeProp.isKind(SyntaxKind.PropertyAssignment)) {
      // If there's an existing `type` property, remove it
      if (typeProp) {
        try { typeProp.remove(); fileModified = true; } catch(e) {}
      }
      // Rename `metricType:` to `type:`
      try { metricTypeProp.getNameNode().replaceWithText('type'); fileModified = true; } catch(e) {}
    }

    if (behaviorProp && behaviorProp.isKind(SyntaxKind.PropertyAssignment)) {
      // Rename `behavior:` to `origin:`
      try { behaviorProp.getNameNode().replaceWithText('origin'); fileModified = true; } catch(e) {}
    }
  });

  // 3. Remove MetricBehavior imports
  const importDecls = sourceFile.getDescendantsOfKind(SyntaxKind.ImportDeclaration);
  importDecls.forEach(decl => {
    const moduleSpecifier = decl.getModuleSpecifierValue();
    if (moduleSpecifier.includes('MetricBehavior')) {
      try { decl.remove(); fileModified = true; } catch(e) {}
    } else {
      // Also check if MetricBehavior is part of named imports
      const namedImports = decl.getNamedImports();
      const behaviorImport = namedImports.find(ni => ni.getName() === 'MetricBehavior');
      if (behaviorImport) {
        try { behaviorImport.remove(); fileModified = true; } catch(e) {}
        // If no more imports, remove the whole declaration
        if (decl.getNamedImports().length === 0) {
          try { decl.remove(); } catch(e) {}
        }
      }
    }
  });

  if (fileModified) {
    sourceFile.saveSync();
    modifiedCount++;
    console.log(`Modified ${sourceFile.getFilePath()}`);
  }
});

console.log(`AST Refactoring applied to ${modifiedCount} files.`);
