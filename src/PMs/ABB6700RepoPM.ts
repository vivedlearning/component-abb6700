import { AppObject, AppObjectPM, AppObjectRepo } from "@vived/core";
import { ABB6700Repo } from "../Entities/ABB6700Repo";

export interface ABB6700RepoVM {
  entityIds: string[];
}

export abstract class ABB6700RepoPM extends AppObjectPM<ABB6700RepoVM> {
  static readonly type = "ABB6700RepoPM";

  static get(appObj: AppObject): ABB6700RepoPM | undefined {
    return appObj.getComponent<ABB6700RepoPM>(this.type);
  }

  static getById(
    id: string,
    appObjects: AppObjectRepo,
  ): ABB6700RepoPM | undefined {
    return appObjects.get(id)?.getComponent<ABB6700RepoPM>(this.type);
  }
}

export function makeABB6700RepoPM(appObject: AppObject): ABB6700RepoPM {
  return new ABB6700RepoPMImp(appObject);
}

class ABB6700RepoPMImp extends ABB6700RepoPM {
  defaultVM: ABB6700RepoVM = { entityIds: [] };

  private get repo(): ABB6700Repo | undefined {
    try {
      return this.getCachedLocalComponent<ABB6700Repo>(ABB6700Repo.type);
    } catch {
      return undefined;
    }
  }

  vmsAreEqual(a: ABB6700RepoVM, b: ABB6700RepoVM): boolean {
    if (a.entityIds.length !== b.entityIds.length) {
      return false;
    }

    const aSorted = [...a.entityIds].sort();
    const bSorted = [...b.entityIds].sort();

    return aSorted.every((id, index) => id === bSorted[index]);
  }

  formVM(): void {
    if (!this.repo) return;

    this.doUpdateView({
      entityIds: this.repo.getAll().map((entity) => entity.appObject.id),
    });
  }

  constructor(appObject: AppObject) {
    super(appObject, ABB6700RepoPM.type);

    if (this.repo) {
      this.observeEntity(this.repo);
      this.formVM();
    }
  }
}
