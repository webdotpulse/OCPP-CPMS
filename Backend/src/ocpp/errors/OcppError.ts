export class OcppError extends Error {
  public errorCode: string;
  public errorDescription: string;
  public errorDetails: any;

  constructor(errorCode: string, errorDescription: string, errorDetails: any = {}) {
    super(errorDescription);
    this.name = "OcppError";
    this.errorCode = errorCode;
    this.errorDescription = errorDescription;
    this.errorDetails = errorDetails;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OcppError);
    }
  }
}
