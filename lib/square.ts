// Direct Square API client using fetch (SDK is broken)
const SQUARE_SANDBOX_BASE_URL = 'https://connect.squareupsandbox.com/v2';
const SQUARE_PRODUCTION_BASE_URL = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2024-07-17';

class DirectSquareClient {
  private accessToken: string;
  private isProduction: boolean;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    // Determine if this is production based on access token format
    this.isProduction = !accessToken.includes('sandbox');
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const baseUrl = this.isProduction ? SQUARE_PRODUCTION_BASE_URL : SQUARE_SANDBOX_BASE_URL;
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`🔍 Square API Request:`, {
      url: url,
      method: method,
      isProduction: this.isProduction,
      accessTokenPrefix: this.accessToken.substring(0, 10) + '...',
      endpoint: endpoint
    });
    
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

// Validate access token
const accessToken = process.env.SQUARE_ACCESS_TOKEN;
if (!accessToken) {
  console.error('❌ SQUARE_ACCESS_TOKEN environment variable is not set');
  throw new Error('Square access token is required. Please set SQUARE_ACCESS_TOKEN environment variable.');
}

// Export the direct client
export const squareClient = new DirectSquareClient(accessToken);

// For backward compatibility
export const paymentsApi = squareClient.payments; 