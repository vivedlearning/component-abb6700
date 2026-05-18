import { describe, it, expect, beforeEach } from "vitest";
import {
  Angle,
  AppObjectRepo,
  makeAppObjectRepo,
  makeDomainFactoryRepo,
} from "@vived/core";
import { makeABB6700FeatureFactory } from "./Factory/ABB6700FeatureFactory";
import { createABB6700 } from "./Controllers/createABB6700";
import { aBB6700PMAdapter } from "./Adapters/aBB6700PMAdapter";
import { ABB6700Entity } from "./Entities/ABB6700Entity";
import type { ABB6700VM } from "./PMs/ABB6700PM";

describe("ABB 6700 integration", () => {
  let appObjects: AppObjectRepo;

  beforeEach(() => {
    appObjects = makeAppObjectRepo();
    const factoryRepo = makeDomainFactoryRepo(appObjects);
    makeABB6700FeatureFactory(appObjects);
    factoryRepo.setupDomain();
  });

  it("create → adapter emits default VM with 0° joints", () => {
    createABB6700("item-1", appObjects);

    let vm: ABB6700VM | undefined;
    aBB6700PMAdapter.subscribe("item-1", appObjects, (v) => {
      vm = v;
    });

    expect(vm).toBeDefined();
    expect(vm!.j1.degrees).toBe(0);
    expect(vm!.j2.degrees).toBe(0);
    expect(vm!.j3.degrees).toBe(0);
    expect(vm!.j4.degrees).toBe(0);
    expect(vm!.j5.degrees).toBe(0);
    expect(vm!.j6.degrees).toBe(0);
  });

  it("entity mutation → adapter receives updated VM", () => {
    createABB6700("item-1", appObjects);

    const vms: ABB6700VM[] = [];
    aBB6700PMAdapter.subscribe("item-1", appObjects, (v) => {
      vms.push(v);
    });

    const entity = ABB6700Entity.getById("item-1", appObjects)!;
    entity.j1 = Angle.FromDegrees(45);

    expect(vms[vms.length - 1].j1.degrees).toBe(45);
  });

  it("multiple instances are independent", () => {
    createABB6700("item-a", appObjects);
    createABB6700("item-b", appObjects);

    let vmA: ABB6700VM | undefined;
    let vmB: ABB6700VM | undefined;
    aBB6700PMAdapter.subscribe("item-a", appObjects, (v) => {
      vmA = v;
    });
    aBB6700PMAdapter.subscribe("item-b", appObjects, (v) => {
      vmB = v;
    });

    const entityA = ABB6700Entity.getById("item-a", appObjects)!;
    entityA.j1 = Angle.FromDegrees(90);

    expect(vmA!.j1.degrees).toBe(90);
    expect(vmB!.j1.degrees).toBe(0);
  });
});
