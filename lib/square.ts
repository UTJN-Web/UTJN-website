// Direct Square API client using fetch (SDK is broken)
const SQUARE_SANDBOX_BASE_URL = 'https://connect.squareupsandbox.com/v2';
const SQUARE_VERSION = '2024-07-17';

class DirectSquareClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${SQUARE_SANDBOX_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Status code: ${response.status}\nBody: ${JSON.stringify(data, null, 2)}`);
    }

    return { result: data };
  }

  // Locations API
  locations = {
    list: () => this.makeRequest('/locations')
  };

  // Payments API
  payments = {
    create: (paymentRequest: any) => this.makeRequest('/payments', 'POST', paymentRequest)
  };

  // Refunds API
  refunds = {
    create: (refundRequest: any) => this.makeRequest('/refunds', 'POST', refundRequest),
    get: (refundId: string) => this.makeRequest(`/refunds/${refundId}`)
  };
}

// Export the direct client
export const squareClient = new DirectSquareClient(process.env.SQUARE_ACCESS_TOKEN!);

// For backward compatibility
export const paymentsApi = squareClient.payments; 