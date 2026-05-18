import { AppObject } from "@vived/core";
import {
  ABB6700PM,
  ABB6700VM,
} from "../PMs/ABB6700PM";

/**
 * Mock PM for testing views and adapters in isolation.
 * Always suppresses duplicate emission in tests.
 */
export class MockABB6700PM extends ABB6700PM {
  vmsAreEqual = (): boolean => true;

  constructor(appObject: AppObject) {
    super(appObject, ABB6700PM.type);
  }
}
