import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@material-ui/core';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          V-Care
        </Typography>
        <Button color="inherit" component={Link} to="/">
          Home
        </Button>
        <Button color="inherit" component={Link} to="/register">
          Register as Donor
        </Button>
        <Button color="inherit" component={Link} to="/search">
          Find Donors
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;