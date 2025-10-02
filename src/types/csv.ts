// CSV Parsing and PapaParse Types

export interface ParseResult<T> {
  data: T[];
  errors: ParseError[];
  meta: ParseMeta;
}

export interface ParseError {
  type: string;
  code: string;
  message: string;
  row?: number;
}

export interface ParseMeta {
  delimiter: string;
  linebreak: string;
  aborted: boolean;
  truncated: boolean;
  cursor: number;
  fields?: string[];
}

export interface ParseConfig {
  delimiter?: string;
  newline?: string;
  quoteChar?: string;
  escapeChar?: string;
  header?: boolean;
  transformHeader?: (header: string) => string;
  dynamicTyping?: boolean | { [key: string]: boolean };
  preview?: number;
  encoding?: string;
  worker?: boolean;
  comments?: boolean | string;
  step?: (results: ParseResult<unknown>, parser: unknown) => void;
  complete?: (results: ParseResult<unknown>) => void;
  error?: (error: ParseError) => void;
  download?: boolean;
  downloadRequestHeaders?: { [key: string]: string };
  downloadRequestBody?: string;
  skipEmptyLines?: boolean | 'greedy';
  chunk?: (results: ParseResult<unknown>, parser: unknown) => void;
  fastMode?: boolean;
  beforeFirstChunk?: (chunk: string) => string | void;
  withCredentials?: boolean;
  transform?: (value: string, field: string | number) => unknown;
  delimitersToGuess?: string[];
}

// Raw CSV row types (as string values before processing)
export interface RawCampaignDataRow {
  DATE: string;
  'CAMPAIGN ORDER NAME': string;
  IMPRESSIONS: string;
  CLICKS: string;
  REVENUE: string;
  SPEND: string;
  TRANSACTIONS?: string;
  [key: string]: string | undefined;
}

export interface RawContractTermsRow {
  Name: string;
  'Start Date': string;
  'End Date': string;
  Budget: string;
  CPM?: string;
  'Impressions Goal'?: string;
  [key: string]: string | undefined;
}

export interface RawPacingDataRow {
  DATE: string;
  'CAMPAIGN ORDER NAME': string;
  IMPRESSIONS: string;
  SPEND: string;
  [key: string]: string | undefined;
}

// Generic CSV row for unknown structure
export interface GenericCSVRow {
  [key: string]: string | number | undefined;
}
