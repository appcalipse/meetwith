import type {NextPage} from 'next';
import React from 'react';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Subscribe from '../components/landing/Subscribe';
import Pricing from '../components/landing/Pricing';
import FAQ from '../components/landing/FAQ';

const Home: NextPage = () => {
  return (
    <div>

      <main>
        <Hero />

        <Features />

        <Subscribe />

        <Pricing />

        <FAQ />
      </main>
    </div>
  );
};

export default Home;
