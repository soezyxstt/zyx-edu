import { compileMarkdown } from "../lib/markdown-compiler";
import { validateAST } from "../lib/ast-validator";

function runTests() {
  console.log("=== STARTING Zyx VISUAL BLOCK COMPILER & VALIDATOR TESTS ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Test Chart Parsing
  console.log("\n--- Test 1: Parsing & Validating Charts ---");
  const chartMarkdown = `# Chapter 1: Physics Experiments
:::concept {koId="ko-1", title="Eksperimen"}
Lihat hasil pada [[visual:chart-eksperimen]].
:::

:::chart {id="chart-eksperimen", title="Hasil Eksperimen Kecepatan", caption="Grafik hubungan waktu dan jarak"}
chartType: line
xLabel: Waktu (s)
yLabel: Jarak (m)
data:
  - [0, 0]
  - [1, 10]
  - [2, 20]
  - [3, 45]
:::
`;
  const chartRes = compileMarkdown(chartMarkdown, "ch-1", "course-1");
  const chartVal = validateAST(chartRes.ast);
  
  assert(chartVal.success === true, "Chart compiles and validates without errors");
  if (!chartVal.success) {
    console.error(JSON.stringify(chartVal.errors, null, 2));
  }

  const chartBlock = chartRes.ast.blocks.find(b => b.type === "visual" && b.visualType === "chart");
  assert(chartBlock !== undefined, "Chart block successfully created in AST");
  if (chartBlock && chartBlock.type === "visual" && chartBlock.visualType === "chart") {
    assert(chartBlock.title === "Hasil Eksperimen Kecepatan", "Chart title parsed correctly");
    assert(chartBlock.caption === "Grafik hubungan waktu dan jarak", "Chart caption parsed correctly");
    assert(chartBlock.data.chartType === "line", "Chart type parsed correctly");
    assert(chartBlock.data.xLabel === "Waktu (s)", "Chart xLabel parsed correctly");
    assert(chartBlock.data.yLabel === "Jarak (m)", "Chart yLabel parsed correctly");
    assert(Array.isArray(chartBlock.data.data) && chartBlock.data.data.length === 4, "Chart data contains 4 points");
  }

  // 2. Test Graph Parsing
  console.log("\n--- Test 2: Parsing & Validating Graphs ---");
  const graphMarkdown = `# Chapter 2: Math Functions
:::concept {koId="ko-2", title="Grafik Fungsi"}
Visualisasi fungsi [[visual:graph-fungsi]].
:::

:::graph {id="graph-fungsi", title="Fungsi Trigonometri", caption="Plot y = sin(x)"}
equation: sin(x)
domain:
  min: -3.14
  max: 3.14
samples: 100
:::
`;
  const graphRes = compileMarkdown(graphMarkdown, "ch-2", "course-1");
  const graphVal = validateAST(graphRes.ast);

  assert(graphVal.success === true, "Graph compiles and validates without errors");
  if (!graphVal.success) {
    console.error(JSON.stringify(graphVal.errors, null, 2));
  }

  const graphBlock = graphRes.ast.blocks.find(b => b.type === "visual" && b.visualType === "graph");
  assert(graphBlock !== undefined, "Graph block successfully created in AST");
  if (graphBlock && graphBlock.type === "visual" && graphBlock.visualType === "graph") {
    assert(graphBlock.title === "Fungsi Trigonometri", "Graph title parsed correctly");
    assert(graphBlock.data.functions.includes("sin(x)"), "Graph equations list includes sin(x)");
    assert(graphBlock.data.domain.min === -3.14, "Graph domain min parsed correctly");
    assert(graphBlock.data.domain.max === 3.14, "Graph domain max parsed correctly");
    assert(graphBlock.data.samples === 100, "Graph samples count parsed correctly");
  }

  // 3. Test Flowchart & Diagram Parsing
  console.log("\n--- Test 3: Parsing & Validating Flowcharts and Diagrams ---");
  const flowMarkdown = `# Chapter 3: Process Flow
:::concept {koId="ko-3", title="Proses"}
Ikuti alur [[visual:flow-proses]].
:::

:::flowchart {id="flow-proses", title="Alur Algoritma", caption="Langkah-langkah eksekusi program"}
Langkah 1: Mulai --> Langkah 2: Proses Data
Langkah 2: Proses Data -- Sukses --> Langkah 3: Selesai
:::
`;
  const flowRes = compileMarkdown(flowMarkdown, "ch-3", "course-1");
  const flowVal = validateAST(flowRes.ast);

  assert(flowVal.success === true, "Flowchart compiles and validates without errors");
  if (!flowVal.success) {
    console.error(JSON.stringify(flowVal.errors, null, 2));
  }

  const flowBlock = flowRes.ast.blocks.find(b => b.type === "visual" && b.visualType === "flowchart");
  assert(flowBlock !== undefined, "Flowchart block successfully created in AST");
  if (flowBlock && flowBlock.type === "visual" && flowBlock.visualType === "flowchart") {
    assert(flowBlock.title === "Alur Algoritma", "Flowchart title parsed correctly");
    assert(flowBlock.data.nodes.length === 3, "Flowchart nodes parsed correctly (Mulai, Proses Data, Selesai)");
    assert(flowBlock.data.edges.length === 2, "Flowchart edges parsed correctly");
    
    const node1 = flowBlock.data.nodes.find((n: any) => n.id === "langkah-1-mulai");
    assert(node1 !== undefined, "Flowchart nodes normalized correctly");
    if (node1) {
      assert(node1.label === "Mulai", "Cleaned step labels correctly");
      assert(node1.stepNumber === 1, "Parsed step number correctly");
    }

    const edge1 = flowBlock.data.edges.find((e: any) => e.source === "langkah-2-proses-data");
    assert(edge1 !== undefined && edge1.target === "langkah-3-selesai" && edge1.label === "Sukses", "Parsed edge label correctly");
  }

  // 4. Test Error Cases / Semantic Integrity
  console.log("\n--- Test 4: Error Handling & Integrity ---");

  // A. Mentions visual block that does not exist
  const badRefMarkdown = `# Chapter 4: Broken Ref
:::concept {koId="ko-4", title="Broken Link"}
Sistem ini memicu [[visual:non-existent-visual]].
:::
`;
  const badRefRes = compileMarkdown(badRefMarkdown, "ch-4", "course-1");
  const badRefVal = validateAST(badRefRes.ast);
  assert(badRefVal.success === false, "Fails validation when referring to non-existent visual block");
  assert(
    badRefVal.errors.some(e => e.message.includes("no matching visual block")),
    "Correctly reports missing visual block reference error"
  );

  // B. Flowchart with fewer than 2 nodes
  const badFlowMarkdown = `# Chapter 5: Invalid Flow
:::flowchart {id="bad-flow"}
HanyaSatuNode
:::
`;
  const badFlowRes = compileMarkdown(badFlowMarkdown, "ch-5", "course-1");
  const badFlowVal = validateAST(badFlowRes.ast);
  assert(badFlowVal.success === false, "Fails validation when flowchart has fewer than 2 nodes");
  assert(
    badFlowVal.errors.some(e => e.message.includes("Flowchart must contain at least 2 nodes")),
    "Correctly reports insufficient nodes error for flowchart"
  );

  // C. Diagram with fewer than 1 node/edge
  const badDiagramMarkdown = `# Chapter 6: Invalid Diagram
:::diagram {id="bad-diagram"}
:::
`;
  const badDiagramRes = compileMarkdown(badDiagramMarkdown, "ch-6", "course-1");
  const badDiagramVal = validateAST(badDiagramRes.ast);
  assert(badDiagramVal.success === false, "Fails validation when diagram has no nodes or edges");
  assert(
    badDiagramVal.errors.some(e => e.message.includes("Diagram must contain at least 1 node")),
    "Correctly reports diagram empty nodes error"
  );

  // 5. Test Example Block parsing (BSD vs Legacy)
  console.log("\n--- Test 5: Example Block parsing (BSD vs Legacy) ---");
  const bsdExampleMarkdown = `# Chapter 7: BSD Example
:::example {ref="ko-ex-bsd", difficulty="easy"}
#### Problem
Calculate force with mass 5 kg and acceleration 2 m/s^2.

#### Solution
1. Identify variables: m = 5 kg, a = 2 m/s^2.
2. Compute: $F = m \\cdot a = 10 \\text{ N}$.
:::
`;
  const legacyExampleMarkdown = `# Chapter 7: Legacy Example
:::example {koId="ko-ex-bsd", difficulty="easy"}
**Problem**: Calculate force with mass 5 kg and acceleration 2 m/s^2.
**Solution**:
1. Identify variables: m = 5 kg, a = 2 m/s^2.
2. Compute: $F = m \\cdot a = 10 \\text{ N}$.
:::
`;

  const bsdExRes = compileMarkdown(bsdExampleMarkdown, "ch-7", "course-1");
  const legacyExRes = compileMarkdown(legacyExampleMarkdown, "ch-7", "course-1");

  assert(bsdExRes.ast.blocks.length === 2, "BSD Example parses into expected blocks count");
  assert(legacyExRes.ast.blocks.length === 2, "Legacy Example parses into expected blocks count");

  const bsdExBlock = bsdExRes.ast.blocks.find(b => b.type === "example") as any;
  const legacyExBlock = legacyExRes.ast.blocks.find(b => b.type === "example") as any;

  assert(bsdExBlock !== undefined, "BSD example block created successfully");
  assert(legacyExBlock !== undefined, "Legacy example block created successfully");

  if (bsdExBlock && legacyExBlock) {
    assert(bsdExBlock.metadata.koId === "ko-ex-bsd", "BSD example block has resolved koId from ref");
    assert(legacyExBlock.metadata.koId === "ko-ex-bsd", "Legacy example block has resolved koId from koId");
    assert(bsdExBlock.content.problemStatement === "Calculate force with mass 5 kg and acceleration 2 m/s^2.", "BSD example problem Statement matches expected");
    assert(legacyExBlock.content.problemStatement === "Calculate force with mass 5 kg and acceleration 2 m/s^2.", "Legacy example problem Statement matches expected");
    assert(bsdExBlock.content.solutionSteps.length === 2, "BSD example solutionSteps parsed correctly");
    assert(legacyExBlock.content.solutionSteps.length === 2, "Legacy example solutionSteps parsed correctly");
    assert(bsdExBlock.content.solutionSteps[0].explanationMarkdown === "Identify variables: m = 5 kg, a = 2 m/s^2.", "BSD example step 1 correct");
    assert(legacyExBlock.content.solutionSteps[0].explanationMarkdown === "Identify variables: m = 5 kg, a = 2 m/s^2.", "Legacy example step 1 correct");
  }

  // 6. Test Misconception Block parsing (BSD vs Legacy)
  console.log("\n--- Test 6: Misconception Block parsing (BSD vs Legacy) ---");
  const bsdMiscMarkdown = `# Chapter 8: BSD Misconception
:::misconception {ref="ko-misc-bsd"}
#### Misconception
Mass changes with gravity.

#### Correction
Mass is constant. Weight changes.
:::
`;
  const legacyMiscMarkdown = `# Chapter 8: Legacy Misconception
:::misconception {koId="ko-misc-bsd"}
**Misconception**: Mass changes with gravity.
**Correction**: Mass is constant. Weight changes.
:::
`;

  const bsdMiscRes = compileMarkdown(bsdMiscMarkdown, "ch-8", "course-1");
  const legacyMiscRes = compileMarkdown(legacyMiscMarkdown, "ch-8", "course-1");

  const bsdMiscBlock = bsdMiscRes.ast.blocks.find(b => b.type === "misconception") as any;
  const legacyMiscBlock = legacyMiscRes.ast.blocks.find(b => b.type === "misconception") as any;

  assert(bsdMiscBlock !== undefined, "BSD misconception block created successfully");
  assert(legacyMiscBlock !== undefined, "Legacy misconception block created successfully");

  if (bsdMiscBlock && legacyMiscBlock) {
    assert(bsdMiscBlock.metadata.koId === "ko-misc-bsd", "BSD misconception block has resolved koId from ref");
    assert(legacyMiscBlock.metadata.koId === "ko-misc-bsd", "Legacy misconception block has resolved koId from koId");
    assert(bsdMiscBlock.content.myth === "Mass changes with gravity.", "BSD misconception myth matches expected");
    assert(legacyMiscBlock.content.myth === "Mass changes with gravity.", "Legacy misconception myth matches expected");
    assert(bsdMiscBlock.content.correctionMarkdown === "Mass is constant. Weight changes.", "BSD misconception correction matches expected");
    assert(legacyMiscBlock.content.correctionMarkdown === "Mass is constant. Weight changes.", "Legacy misconception correction matches expected");
  }

  // 7. Test Example Narrative Solution Fallback (BSD narrative)
  console.log("\n--- Test 7: Example Narrative Solution Fallback ---");
  const narrativeExampleMarkdown = `# Chapter 9: Narrative Example
:::example {ref="ko-ex-narrative"}
#### Problem
What is 2 + 2?

#### Solution
This is a narrative solution without steps.
We can add detail here.
:::
`;
  const narrativeExRes = compileMarkdown(narrativeExampleMarkdown, "ch-9", "course-1");
  const narrativeExBlock = narrativeExRes.ast.blocks.find(b => b.type === "example") as any;

  assert(narrativeExBlock !== undefined, "Narrative example block created successfully");
  if (narrativeExBlock) {
    assert(narrativeExBlock.content.problemStatement === "What is 2 + 2?", "Narrative example problemStatement is correct");
    assert(narrativeExBlock.content.solutionSteps.length === 1, "Narrative solution fallback created a single step");
    assert(narrativeExBlock.content.solutionSteps[0].stepIndex === 1, "Narrative solution step has index 1");
    assert(narrativeExBlock.content.solutionSteps[0].label === "Solusi", "Narrative solution step has label 'Solusi'");
    assert(narrativeExBlock.content.solutionSteps[0].explanationMarkdown.includes("This is a narrative solution without steps."), "Narrative solution step content is correct");
  }

  console.log(`\n=== TEST SUITE COMPLETED: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

try {
  runTests();
} catch (err) {
  console.error("Test execution encountered an error:", err);
  process.exit(1);
}
