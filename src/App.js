import React from "react";
// import UniverseSimulationMinimal from "./UniverseSimulationMinimal";
// import UniverseSimulationFullUniverse from "./UniverseSimulationFullUniverse";
// import UniverseSimulationDebug from "./UniverseSimulationDebug";
// import UniverseSimulationOptimized from "./UniverseSimulationOptimized";
// import UniverseSimulationNanite from "./UniverseSimulationNanite";
// import UniverseSimulationV2 from "./UniverseSimulationV2";
import UniverseSimulationParallel from "./UniverseSimulationParallel";
import "./App.css";

function App() {
  console.log('App component rendering...');
  return (
    <div className="App" style={{ backgroundColor: 'black' }}>
      <UniverseSimulationParallel />
    </div>
  );
}

export default App;
