import React from 'react';
import { RekapView } from './RekapView';
import { Student, Jurusan } from '../types';

interface RekapPDViewProps {
  students: Student[];
  jurusanList?: Jurusan[];
}

export const RekapPDView: React.FC<RekapPDViewProps> = (props) => {
  return <RekapView {...props} />;
};

export default RekapPDView;
