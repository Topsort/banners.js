export class TopsortRequestError extends Error {
  readonly name: string;
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TopsortRequestError";
    this.status = status;
  }

  static isTopsortRequestError(error: Error): error is TopsortRequestError {
    return error.name === "TopsortRequestError";
  }
}

export class TopsortConfigurationError extends Error {
  readonly name: string;
  readonly slotId?: string;
  readonly apiKey?: string;
  constructor(apiKey?: string, slotId?: string) {
    let message = "Missing ";
    if (!slotId && !apiKey) {
      message += "API Key and Slot ID";
    } else if (!slotId) {
      message += "Slot ID";
    } else if (!apiKey) {
      message += "API Key";
    }
    super(message);
    this.name = "TopsortConfigurationError";
  }

  static isTopsortConfigurationError(error: Error): error is TopsortConfigurationError {
    return error.name === "TopsortConfigurationError";
  }
}
