import React, { useState } from 'react';
import { TextField, Button, Container, Grid, Typography, Card, CardContent } from '@material-ui/core';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const getFriendlyErrorMessage = (error) => {
  if (!error) return 'Unable to search right now. Please try again.';
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please check your network and try again.';
    if (!error.response) return 'Network error. Please check your connection.';
    if (error.response.status >= 500) return 'Server error. Please try again later.';
    return error.response.data?.message || 'Error searching donors. Please verify your input and try again.';
  }
  return error.message || 'Error searching donors. Please try again.';
};

const SearchDonors = () => {
  const [searchParams, setSearchParams] = useState({
  const [searchParams, setSearchParams] = useState({
    bloodGroup: '',
    city: ''
  });
  const [donors, setDonors] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await api.get('/api/search', {
        params: searchParams
      });
      setDonors(response.data);
    } catch (error) {
      alert(getFriendlyErrorMessage(error));
      setDonors([]);
    }
  };

  const handleChange = (e) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" align="center" gutterBottom>
        Search Blood Donors
      </Typography>
      <form onSubmit={handleSearch}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Blood Group"
              name="bloodGroup"
              value={searchParams.bloodGroup}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              name="city"
              value={searchParams.city}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
            >
              Search Donors
            </Button>
          </Grid>
        </Grid>
      </form>

      <Grid container spacing={2} style={{ marginTop: '2rem' }}>
        {donors.map((donor) => (
          <Grid item xs={12} key={donor._id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{donor.name}</Typography>
                <Typography color="textSecondary">
                  Blood Group: {donor.bloodGroup}
                </Typography>
                <Typography>
                  Location: {donor.city}, {donor.state}, {donor.country}
                </Typography>
                <Typography>
                  Contact: {donor.phoneNumber} | {donor.email}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default SearchDonors;