export interface Route {
  path: string;
  htmlFile: string;
  htmlContent: string;
}

export interface ParsedOutput {
  buildId: string;
  routes: Route[];
  cssFiles: Map<string, string>;
  jsFiles: Map<string, string>;
  fontFiles: Map<string, ArrayBuffer>;
  imageFiles: Map<string, ArrayBuffer>;
}

export interface InlinedRoute {
  path: string;
  headContent: string;
  bodyContent: string;
  htmlContent: string;
}

export interface InlinedOutput {
  buildId: string;
  routes: InlinedRoute[];
  inlinedCss: string;
  inlinedJs: string;
  allInlinedFiles: Map<string, string>;
}
