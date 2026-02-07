const fetch = require('node-fetch');

// Test the new lecture endpoints
async function testLectures() {
    const baseUrl = 'http://localhost:5000/api';
    
    try {
        console.log('🧪 Testing Lecture Endpoints...\n');
        
        // Test 1: Try to create lecture as OWNER (should work)
        console.log('1. Testing OWNER lecture creation...');
        const createResponse = await fetch(`${baseUrl}/lectures`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODQ1NjcwMDlmMDIxMmQ1NzM4Nzk1NiIsInJvbGUiOiJPV05FUiIsImlhdCI6MTczODg4MzIwMCwiZXhwIjoxNzM4OTY5NjAwfQ.YOUR_TOKEN_HERE' // Replace with actual OWNER token
            },
            body: JSON.stringify({
                title: "Test Physics Lecture",
                youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
                description: "Test lecture for validation",
                classRef: "69566c6b609de7f160cfc2b7", // Replace with actual class ID
                subject: "Physics",
                gradeLevel: "10th Grade",
                isLocked: false
            })
        });
        
        const createResult = await createResponse.json();
        console.log('Create result:', createResult);
        
        // Test 2: Try to access student lectures endpoint
        console.log('\n2. Testing student lectures endpoint...');
        const studentResponse = await fetch(`${baseUrl}/lectures/student`, {
            headers: {
                'Cookie': 'authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODQ1NjcwMDlmMDIxMmQ1NzM4Nzk1NiIsInJvbGUiOiJPV05FUiIsInN0dWRlbnRJZCI6IjI2MDAwMSIsImlhdCI6MTczODg4MzIwMCwiZXhwIjoxNzM4OTY5NjAwfQ.YOUR_TOKEN_HERE' // Replace with actual student token
            }
        });
        
        const studentResult = await studentResponse.json();
        console.log('Student lectures result:', studentResult);
        
        // Test 3: Test YouTube URL validation
        console.log('\n3. Testing YouTube URL validation...');
        const validateResponse = await fetch(`${baseUrl}/lectures/validate-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODQ1NjcwMDlmMDIxMmQ1NzM4Nzk1NiIsInJvbGUiOiJPV05FUiIsImlhdCI6MTczODg4MzIwMCwiZXhwIjoxNzM4OTY5NjAwfQ.YOUR_TOKEN_HERE'
            },
            body: JSON.stringify({
                url: "https://youtu.be/dQw4w9WgXcQ"
            })
        });
        
        const validateResult = await validateResponse.json();
        console.log('Validation result:', validateResult);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLectures();