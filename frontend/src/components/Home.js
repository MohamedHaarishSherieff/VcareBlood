import React from 'react';
import { Container, Typography, Paper, Grid, Button } from '@material-ui/core';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Container maxWidth="md" style={{ marginTop: '2rem' }}>
      <Paper style={{ padding: '2rem' }}>
        <Typography variant="h3" align="center" gutterBottom>
          Welcome to V-Care
        </Typography>
        <Typography variant="h5" align="center" gutterBottom>
          Connecting Blood Donors with Those in Need
        </Typography>
        <Typography paragraph align="center">
          V-Care is a platform dedicated to making blood donation easier and more accessible.
          Whether you want to donate blood or are in need of blood, we're here to help.
        </Typography>
        <Grid container spacing={4} justifyContent="center" style={{ marginTop: '2rem' }}>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/register"
              size="large"
            >
              Register as Donor
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="primary"
              component={Link}
              to="/search"
              size="large"
            >
              Find Donors
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Home;