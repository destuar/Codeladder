import React from 'react';

const DottedBackground: React.FC = () => {
  return (
    <div className="absolute top-[-4rem] left-0 right-0 bottom-0 z-0 bg-dot-[#5271FF]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
  );
};

export default DottedBackground; 