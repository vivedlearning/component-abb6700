import { describe, it, expect, beforeEach } from "vitest";
import { Angle, AppObject, makeAppObjectRepo } from "@vived/core";
import { ABB6700Entity, makeABB6700Entity } from "./ABB6700Entity";

describe("ABB6700Entity", () => {
  let appObjects: ReturnType<typeof makeAppObjectRepo>;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
  });

  describe("Construction and Default State", () => {
    it("creates with correct default joint angles (0 degrees)", () => {
      const appObject = appObjects.getOrCreate("test-arm");
      const entity = makeABB6700Entity(appObject);

      expect(entity.j1.degrees).toBe(0);
      expect(entity.j2.degrees).toBe(0);
      expect(entity.j3.degrees).toBe(0);
      expect(entity.j4.degrees).toBe(0);
      expect(entity.j5.degrees).toBe(0);
      expect(entity.j6.degrees).toBe(0);
    });

    it("registers itself on the AppObject during construction", () => {
      const appObject = appObjects.getOrCreate("test-arm");
      const entity = makeABB6700Entity(appObject);

      const retrieved = appObject.getComponent(ABB6700Entity.type);
      expect(retrieved).toBe(entity);
    });
  });

  describe("Static Helper Methods", () => {
    describe("get()", () => {
      it("returns undefined when component doesn't exist", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const result = ABB6700Entity.get(appObject);
        expect(result).toBeUndefined();
      });

      it("returns the component when it exists", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const entity = makeABB6700Entity(appObject);
        const result = ABB6700Entity.get(appObject);
        expect(result).toBe(entity);
      });
    });

    describe("getById()", () => {
      it("returns undefined when AppObject doesn't exist", () => {
        const result = ABB6700Entity.getById("nonexistent", appObjects);
        expect(result).toBeUndefined();
      });

      it("returns undefined when AppObject exists but component doesn't", () => {
        appObjects.getOrCreate("test-arm");
        const result = ABB6700Entity.getById("test-arm", appObjects);
        expect(result).toBeUndefined();
      });

      it("returns the component when both AppObject and component exist", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const entity = makeABB6700Entity(appObject);
        const result = ABB6700Entity.getById("test-arm", appObjects);
        expect(result).toBe(entity);
      });
    });

    describe("addIfMissing()", () => {
      it("creates new component when none exists", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const entity = ABB6700Entity.addIfMissing(appObject);

        expect(entity.j1.degrees).toBe(0);
        expect(ABB6700Entity.get(appObject)).toBe(entity);
      });

      it("returns existing component when it already exists", () => {
        const appObject = appObjects.getOrCreate("test-arm");
        const originalEntity = makeABB6700Entity(appObject);
        const retrievedEntity = ABB6700Entity.addIfMissing(appObject);

        expect(retrievedEntity).toBe(originalEntity);
      });
    });
  });

  describe("Joint Angle Getters and Setters", () => {
    let entity: ABB6700Entity;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
    });

    it("can set and get j1 angle", () => {
      entity.j1 = Angle.FromDegrees(45);
      expect(entity.j1.degrees).toBe(45);
    });

    it("can set and get j2 angle", () => {
      entity.j2 = Angle.FromDegrees(90);
      expect(entity.j2.degrees).toBe(90);
    });

    it("can set and get j3 angle", () => {
      entity.j3 = Angle.FromDegrees(-30);
      expect(entity.j3.degrees).toBe(-30);
    });

    it("can set and get j4 angle", () => {
      entity.j4 = Angle.FromDegrees(180);
      expect(entity.j4.degrees).toBe(180);
    });

    it("can set and get j5 angle", () => {
      entity.j5 = Angle.FromDegrees(60);
      expect(entity.j5.degrees).toBe(60);
    });

    it("can set and get j6 angle", () => {
      entity.j6 = Angle.FromDegrees(-90);
      expect(entity.j6.degrees).toBe(-90);
    });

    it("joints are independent of each other", () => {
      entity.j1 = Angle.FromDegrees(10);
      entity.j2 = Angle.FromDegrees(20);
      entity.j3 = Angle.FromDegrees(30);
      entity.j4 = Angle.FromDegrees(40);
      entity.j5 = Angle.FromDegrees(50);
      entity.j6 = Angle.FromDegrees(60);

      expect(entity.j1.degrees).toBe(10);
      expect(entity.j2.degrees).toBe(20);
      expect(entity.j3.degrees).toBe(30);
      expect(entity.j4.degrees).toBe(40);
      expect(entity.j5.degrees).toBe(50);
      expect(entity.j6.degrees).toBe(60);
    });
  });

  describe("Change Notifications", () => {
    let entity: ABB6700Entity;

    beforeEach(() => {
      const appObject = appObjects.getOrCreate("test-arm");
      entity = makeABB6700Entity(appObject);
    });

    it("notifies observers when j1 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j1 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j2 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j2 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j3 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j3 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j4 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j4 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j5 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j5 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies observers when j6 changes", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j6 = Angle.FromDegrees(45);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it("does not notify observers when setting the same value", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.j1 = Angle.FromDegrees(0); // Same as default
      expect(observer).not.toHaveBeenCalled();
    });

    it("allows observer removal", () => {
      const observer = vi.fn();
      entity.addChangeObserver(observer);
      entity.removeChangeObserver(observer);
      entity.j1 = Angle.FromDegrees(45);
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe("Multiple Arms Independence", () => {
    it("maintains independent state for multiple arms", () => {
      const appObject1 = appObjects.getOrCreate("arm-1");
      const appObject2 = appObjects.getOrCreate("arm-2");

      const entity1 = makeABB6700Entity(appObject1);
      const entity2 = makeABB6700Entity(appObject2);

      entity1.j1 = Angle.FromDegrees(45);

      expect(entity2.j1.degrees).toBe(0);
    });
  });
});
