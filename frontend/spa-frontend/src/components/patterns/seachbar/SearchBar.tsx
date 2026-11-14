import type {Group} from "../../../api";
import type {GroupFilter} from "../../../hooks/useOwnerFilter.ts";
import {GroupFilterSelect} from "../group_filter/GroupFilterSelect.tsx";
import styles from './SearchBar.module.css'


export default function SearchBar({
                         value,
                         onChange,
                         userGroups,
                         ownerFilter,
                         onChange1: setOwnerFilter,
                         placeholder1,
                       }:{
  value: string;
  onChange: (event: any) => void;
  userGroups: Group[];
  ownerFilter: number | "all";
  onChange1: (value: GroupFilter) => void;
  placeholder1: string;
}) {
  return <div className={styles.controls}>
    <input
      className={`input ${styles.search}`}
      placeholder={placeholder1}
      value={value}
      onChange={onChange}
    />


    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
      {/*<SegmentedControl*/}
      {/*  options={KIND_OPTIONS}*/}
      {/*  value={kind}*/}
      {/*  onChange={setKind}*/}
      {/*  ariaLabel="Rezeptart filtern"*/}
      {/*/>*/}
      <GroupFilterSelect
        groups={userGroups}
        value={ownerFilter}
        onChange={setOwnerFilter}
      />
    </div>
  </div>;
}
