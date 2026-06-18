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
