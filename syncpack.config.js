export default {
  versionGroups: [
    {
      label: 'Only check dev, prod, and resolutions',
      dependencyTypes: ['!dev', '!prod', '!resolutions'],
      isIgnored: true,
    },
  ],
};
