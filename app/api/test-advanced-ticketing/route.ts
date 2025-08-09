import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    const testResults = {
      success: false,
      tests: [] as any[],
      errors: [] as string[]
    };

    // Test 1: Seed sample events with advanced ticketing
    try {
      console.log('🧪 Test 1: Seeding sample events...');
      const seedResponse = await fetch(`${backendUrl}/events/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (seedResponse.ok) {
        testResults.tests.push({
          name: 'Event Seeding',
          status: 'PASS',
          message: 'Successfully seeded events with advanced ticketing'
        });
      } else {
        testResults.tests.push({
          name: 'Event Seeding',
          status: 'FAIL', 
          message: `Failed to seed events: ${seedResponse.status}`
        });
      }
    } catch (error) {
      testResults.errors.push(`Event seeding error: ${error}`);
    }

    // Test 2: Get events with advanced ticketing
    try {
      console.log('🧪 Test 2: Fetching events...');
      const eventsResponse = await fetch(`${backendUrl}/events`);
      
      if (eventsResponse.ok) {
        const events = await eventsResponse.json();
        const advancedEvents = events.filter((e: any) => 
          e.enableAdvancedTicketing || e.enableSubEvents
        );
        
        testResults.tests.push({
          name: 'Advanced Events Fetch',
          status: advancedEvents.length > 0 ? 'PASS' : 'FAIL',
          message: `Found ${advancedEvents.length} events with advanced ticketing`,
          data: { totalEvents: events.length, advancedEvents: advancedEvents.length }
        });
      } else {
        testResults.tests.push({
          name: 'Advanced Events Fetch',
          status: 'FAIL',
          message: `Failed to fetch events: ${eventsResponse.status}`
        });
      }
    } catch (error) {
      testResults.errors.push(`Events fetch error: ${error}`);
    }

    // Test 3: Get ticket options for an event
    try {
      console.log('🧪 Test 3: Testing ticket options...');
      // First get an event with advanced ticketing
      const eventsResponse = await fetch(`${backendUrl}/events`);
      const events = await eventsResponse.json();
      const advancedEvent = events.find((e: any) => 
        e.enableAdvancedTicketing || e.enableSubEvents
      );
      
      if (advancedEvent) {
        const ticketOptionsResponse = await fetch(
          `${backendUrl}/events/${advancedEvent.id}/ticket-options?user_email=test@example.com`
        );
        
        if (ticketOptionsResponse.ok) {
          const ticketOptions = await ticketOptionsResponse.json();
          testResults.tests.push({
            name: 'Ticket Options API',
            status: 'PASS',
            message: 'Successfully retrieved ticket options',
            data: {
              eventId: advancedEvent.id,
              eventName: advancedEvent.name,
              hasTicketTiers: ticketOptions.ticketTiers?.length > 0,
              hasSubEvents: ticketOptions.subEvents?.length > 0,
              ticketTiersCount: ticketOptions.ticketTiers?.length || 0,
              subEventsCount: ticketOptions.subEvents?.length || 0
            }
          });
        } else {
          testResults.tests.push({
            name: 'Ticket Options API',
            status: 'FAIL',
            message: `Failed to get ticket options: ${ticketOptionsResponse.status}`
          });
        }
      } else {
        testResults.tests.push({
          name: 'Ticket Options API',
          status: 'SKIP',
          message: 'No advanced events found to test'
        });
      }
    } catch (error) {
      testResults.errors.push(`Ticket options error: ${error}`);
    }

    // Test 4: Database schema validation
    try {
      console.log('🧪 Test 4: Testing database schema...');
      const systemTestResponse = await fetch(`${backendUrl}/events/test`);
      
      if (systemTestResponse.ok) {
        const systemTest = await systemTestResponse.json();
        testResults.tests.push({
          name: 'Database Schema',
          status: 'PASS',
          message: 'Database schema validation passed',
          data: systemTest.statistics
        });
      } else {
        testResults.tests.push({
          name: 'Database Schema',
          status: 'FAIL',
          message: `Database test failed: ${systemTestResponse.status}`
        });
      }
    } catch (error) {
      testResults.errors.push(`Database schema error: ${error}`);
    }

    // Determine overall success
    const failedTests = testResults.tests.filter(t => t.status === 'FAIL');
    testResults.success = failedTests.length === 0 && testResults.errors.length === 0;

    return NextResponse.json({
      success: testResults.success,
      message: testResults.success 
        ? '✅ All advanced ticketing tests passed!' 
        : '❌ Some tests failed - check details',
      summary: {
        totalTests: testResults.tests.length,
        passed: testResults.tests.filter(t => t.status === 'PASS').length,
        failed: testResults.tests.filter(t => t.status === 'FAIL').length,
        skipped: testResults.tests.filter(t => t.status === 'SKIP').length,
        errors: testResults.errors.length
      },
      testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Advanced ticketing test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test system error', 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 