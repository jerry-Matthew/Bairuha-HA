// Quick test script to verify location API
console.log('Testing location API...');

fetch('/api/location')
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        return response.json();
    })
    .then(data => {
        console.log('Location data received:', data);
    })
    .catch(error => {
        console.error('Error fetching location:', error);
    });
