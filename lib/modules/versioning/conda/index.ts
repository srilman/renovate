import type { VersioningApi } from "../types";
import { regEx } from '../../../util/regex';


function zipLongest<T>(a: T[], b: T[], fillVal: T): [T, T][] {
  const maxLen = Math.max(a.length, b.length);
  return Array.from(Array(maxLen), (_, i) => [a.at(i) ?? fillVal, b.at(i) ?? fillVal]);
}

function isNumeric(str: string | number): boolean {
  return !isNaN(Number(str));
}


class VersionSort {
  // Main version section
  // Can have multiple parts, each part composed of alphanumeric characters & _
  readonly version: (string | number)[][];
  // Optional local versioning
  readonly local: (string | number)[][];

  constructor(version: (string | number)[][], local: (string | number)[][]) {
    this.version = version;
    this.local = local;
  }

  static _eq(t1: (string | number)[][], t2: (string | number)[][]): boolean {
    for (const [v1, v2] of zipLongest(t1, t2, [])) {
      for (const [c1, c2] of zipLongest(v1, v2, 0)) {
        if (c1 !== c2) {
          return false;
        }
      }
    }
    return true;
  }

  equals(other: VersionSort): boolean {
    return VersionSort._eq(this.version, other.version) && VersionSort._eq(this.local, other.local);
  }

  static _lt(t1: (string | number)[][], t2: (string | number)[][]): boolean | null {
    for (const [v1, v2] of zipLongest(t1, t2, [])) {
      for (const [c1, c2] of zipLongest(v1, v2, 0)) {
        if (c1 === c2) {
          continue;
        } else if (typeof c1 === "string") {
          if (typeof c2 !== "string") {
            // str < int
            return true;
          }
        } else if (typeof c2 === "string") {
          // not (int < str)
          return false;
        }
        // c1 and c2 have the same type
        return c1 < c2;
      }
    }
    // self == other
    return null;
  }

  lessThan(other: VersionSort): boolean {
    const res = VersionSort._lt(this.version, other.version);
    return res ?? (VersionSort._lt(this.local, other.local) ?? false);
  }

  greaterThan(other: VersionSort): boolean {
    return other.lessThan(this);
  }

  lessThanOrEqual(other: VersionSort): boolean {
    return !this.greaterThan(other);
  }

  greaterThanOrEqual(other: VersionSort): boolean {
    return !this.lessThan(other);
  }
}

const VERSION_CHECK_RE = regEx(/^[\*\.\+!_0-9a-z]+$/g);
const VERSION_SPLIT_RE = regEx(/([0-9]+|[*]+|[^0-9*]+)/g);

export function parseVersion(in_vstr: string): VersionSort {
  let vstr = in_vstr.trim().toLowerCase();
  if (vstr === "") {
    throw new Error("Empty version");
  }

  if (vstr.includes("-") && !vstr.includes("_")) {
    vstr = vstr.replaceAll("-", "_");
  }

  // Version Invalid Re-Check
  if (!VERSION_CHECK_RE.test(vstr)) {
    throw new Error("Invalid character(s)");
  }

  // Parse the Epoch
  let epochSplit = vstr.split("!", 3);
  let epoch: string;
  if (epochSplit.length === 1) {
    epoch = "0";
  } else if (epochSplit.length === 2) {
    epoch = epochSplit[0];
  } else {
    throw new Error("duplicated epoch separator");
  }

  // Extract the Local Version String
  let localSplit = epochSplit[-1].split("+", 3);
  let local: string[]
  if (localSplit.length === 1) {
    local = [];
  } else if (localSplit.length === 2) {
    local = localSplit[1].replaceAll("_", ".").split(".");
  } else {
    throw new Error("duplicated local version separator '+'");
  }

  // Split the Main Version Part
  const versionPart = localSplit[0];
  let versionSplit: string[];
  if (versionPart.endsWith("_")) {
    versionSplit = versionPart.substring(0, versionPart.length - 1).replaceAll("_", ".").split(".");
    versionSplit[-1] += "_";
  } else {
    versionSplit = versionPart.replaceAll("_", ".").split(".");
  }

  const version = [epoch, ...versionSplit];

  // Split Components into Runs of Numerals and Non-Numerals
  // Convert Numerals to Int, and Handle Special Strings
  const [versionOut, localOut] = [version, local].map((v) => {
    return v.map((elem) => {
      const parts = [...elem.matchAll(VERSION_SPLIT_RE)];
      if (parts.length === 0) {
        throw new Error("empty version component");
      }

      const newParts = parts.map((part) => {
        const str = part[0];

        if (isNumeric(str)) {
          return Number(str);
        } else if (str === "post") {
          // Ensure number < "post" == infinity
          return Number("inf");
        } else if (str === "dev") {
          // Ensure "*" < "DEV" < "_" < "a" < number
          // by upper-casing (all other strings are lower case)
          return "DEV";
        } else {
          return str;
        }
      });

      if (isNumeric(newParts[0])) {
        return newParts;
      } else {
        return [0, ...newParts];
      }
    });
  });

  return new VersionSort(versionOut, localOut);
}

function validVersion(input: string): boolean {
  // Migrated from https://github.com/conda/conda/blob/0ce67ff01354667d6cf8c956839a401f42e41bde/conda/models/version.py#L49
  try {
    parseVersion(input);
    return true;
  } catch (e) {
    return false;
  }
}

function isVersion(input: string | undefined | null): boolean {
  if (input === undefined || input === null) {
    return false;
  }
  return validVersion(input);
}

function validRange(input: string): boolean {
  return false;
}

function isValid(input: string): boolean {
  return validRange(input) || validVersion(input);
}




export const api: VersioningApi = {
  isValid,
  isVersion,

  equals,
  getMajor,
  getMinor,
  getPatch,
  isCompatible: isVersion, // TODO: Change
  isGreaterThan,
  isSingleVersion,
  isStable,

  matches,
  getSatisfyingVersion,
  minSatisfyingVersion,
  getNewValue,
  sortVersions,
  isLessThanRange,
};

// export default api;
