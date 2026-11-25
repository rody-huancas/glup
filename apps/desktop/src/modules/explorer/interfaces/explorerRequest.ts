// Files from the Explorer, gathered by Rust: the right click's option (a tool of tools.json) or none
// ("Enviar a").
export interface ExplorerRequest {
  tool  : string | null;
  paths : string[];
}
