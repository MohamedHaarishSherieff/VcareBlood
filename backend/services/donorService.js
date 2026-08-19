const { db } = require('../firebase/config');

class DonorService {
  async searchDonors(bloodGroup, city, state) {
    if (!db) {
      // Return mock data when Firebase is not available
      console.log('Firebase not available, returning mock donor data');
      return this.getMockDonors(bloodGroup, city, state);
    }

    try {
      let query = db.collection('donors');

      // Build query based on available parameters
      if (bloodGroup) query = query.where('bloodGroup', '==', bloodGroup);
      if (city) query = query.where('city', '==', city);
      if (state) query = query.where('state', '==', state);

      query = query.orderBy('createdAt', 'desc').limit(20);

      const snapshot = await query.get();
      const donors = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        donors.push({
          id: doc.id,
          name: data.name || 'Anonymous',
          bloodGroup: data.bloodGroup,
          city: data.city,
          state: data.state,
          phoneNumber: data.hidePhoneNumber ? 'Hidden' : data.phoneNumber,
          lastDonation: data.lastDonation,
        });
      });

      return donors;
    } catch (error) {
      console.error('Error searching donors:', error);
      // Fallback to mock data on error
      return this.getMockDonors(bloodGroup, city, state);
    }
  }

  getMockDonors(bloodGroup, city, state) {
    // Mock donor data for testing
    const mockDonors = [
      { id: '1', name: 'Rajesh Kumar', bloodGroup: 'O+', city: 'Chennai', state: 'Tamil Nadu', phoneNumber: '+91 9876543210' },
      { id: '2', name: 'Priya Sharma', bloodGroup: 'A+', city: 'Mumbai', state: 'Maharashtra', phoneNumber: '+91 9876543211' },
      { id: '3', name: 'Amit Singh', bloodGroup: 'B+', city: 'Delhi', state: 'Delhi', phoneNumber: '+91 9876543212' },
      { id: '4', name: 'Sneha Patel', bloodGroup: 'AB+', city: 'Bangalore', state: 'Karnataka', phoneNumber: '+91 9876543213' },
      { id: '5', name: 'Vikram Rao', bloodGroup: 'O-', city: 'Hyderabad', state: 'Telangana', phoneNumber: '+91 9876543214' },
    ];

    // Filter based on criteria
    let filtered = mockDonors;
    if (bloodGroup) {
      filtered = filtered.filter(d => d.bloodGroup === bloodGroup);
    }
    if (city) {
      filtered = filtered.filter(d => d.city.toLowerCase().includes(city.toLowerCase()));
    }
    if (state) {
      filtered = filtered.filter(d => d.state.toLowerCase().includes(state.toLowerCase()));
    }

    return filtered;
  }

  isDonorQuery(message) {
    // Simple detection: check for blood group patterns and location keywords
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const locationKeywords = ['in', 'at', 'near', 'city', 'state', 'chennai', 'mumbai', 'delhi', 'kolkata', 'bangalore'];

    const lowerMessage = message.toLowerCase();
    const hasBloodGroup = bloodGroups.some(bg => lowerMessage.includes(bg.toLowerCase()));
    const hasLocation = locationKeywords.some(kw => lowerMessage.includes(kw));

    return hasBloodGroup && hasLocation;
  }

  extractDonorQuery(message) {
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const lowerMessage = message.toLowerCase();

    let bloodGroup = null;
    let location = null;

    // Extract blood group
    for (const bg of bloodGroups) {
      if (lowerMessage.includes(bg.toLowerCase())) {
        bloodGroup = bg;
        break;
      }
    }

    // Simple location extraction (can be improved with NLP)
    const locationMatch = message.match(/(?:in|at|near)\s+([A-Za-z\s]+)/i);
    if (locationMatch) {
      location = locationMatch[1].trim();
    }

    return { bloodGroup, location };
  }
}

module.exports = new DonorService();