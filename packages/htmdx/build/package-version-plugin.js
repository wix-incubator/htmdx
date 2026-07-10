export const packageVersionModuleId = 'virtual:htmdx-package-version';
const resolvedPackageVersionModuleId = `\0${packageVersionModuleId}`;

export function packageVersionPlugin(version) {
  return {
    name: 'htmdx-package-version',
    resolveId(id) {
      if (id === packageVersionModuleId) {
        return resolvedPackageVersionModuleId;
      }
    },
    load(id) {
      if (id === resolvedPackageVersionModuleId) {
        return `export const packageVersion = ${JSON.stringify(version)};`;
      }
    },
  };
}
