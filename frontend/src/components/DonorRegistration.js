import React, { useState } from 'react';
import { TextField, Button, MenuItem, Container, Grid, Typography } from '@material-ui/core';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const getFriendlyErrorMessage = (error) => {
  if (!error) return 'Registration failed. Please try again.';
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please check your network and try again.';
    if (!error.response) return 'Network error. Please check your connection and try again.';
    if (error.response.status >= 500) return 'Server error. Please try again later.';
    if (error.response.status === 404) return 'Service not found. Please try again later.';
    return error.response.data?.message || 'Registration failed. Please verify your details and try again.';
  }
  return error.message || 'Registration failed. Please try again.';
};

const DonorRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    email: '',
    bloodGroup: '',
    city: '',
    state: '',
    country: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/register', formData);
      alert('Registration successful!');
      setFormData({
        name: '',
        dateOfBirth: '',
        gender: '',
        phoneNumber: '',
        email: '',
        bloodGroup: '',
        city: '',
        state: '',
        country: ''
      });
    } catch (error) {
      alert(getFriendlyErrorMessage(error));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" align="center" gutterBottom>
        Donor Registration
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="date"
              label="Date of Birth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="email"
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Blood Group"
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              required
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
            >
              Register as Donor
            </Button>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default DonorRegistration;