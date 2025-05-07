// Copyright (C) 2024 The Android Open Source Project
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use std::collections::{BTreeMap, BTreeSet};

use cargo_toml::DependencyDetail;
use crates_index::Version;
use itertools::Itertools;
use log::debug;

use crate::{AndroidTarget, DepSet, Error};

/// Resolves a list of enabled features to a set of optional dependencies that these features switch on.
pub struct FeatureResolver<'a> {
    version: &'a Version,
}

impl<'a> FeatureResolver<'a> {
    /// Constructs a FeatureResolver for the specified version of a crate.
    pub fn new(version: &'a Version) -> FeatureResolver<'a> {
        FeatureResolver { version }
    }
    /// Resolves a list of enabled features into a set of optional dependencies.
    pub fn resolve(
        &self,
        features: Option<impl Iterator<Item = impl AsRef<str>>>,
    ) -> Result<DepSet<'a>, Error> {
        debug!("Resolving {}", self.version.name());
        let resolver = cargo_toml::features::Resolver::new();

        let normal_dependencies_by_name = self
            .version
            .dependencies()
            .iter()
            .filter_map(|dep| match dep.kind() {
                crates_index::DependencyKind::Normal => Some((dep.name(), dep)),
                _ => None,
            })
            .collect::<BTreeMap<_, _>>();

        let mut dep_details = Vec::new();
        for dep in self.version.dependencies() {
            dep_details.push(
                if !dep.is_optional() && dep.has_default_features() && dep.package().is_none() {
                    cargo_toml::Dependency::Simple(dep.requirement().into())
                } else {
                    cargo_toml::Dependency::Detailed(Box::new(DependencyDetail {
                        version: Some(dep.requirement().to_string()),
                        package: dep.package().map(String::from),
                        registry: None,
                        registry_index: None,
                        path: None,
                        inherited: false,
                        git: None,
                        branch: None,
                        tag: None,
                        rev: None,
                        features: dep.features().to_vec(),
                        optional: dep.is_optional(),
                        default_features: dep.has_default_features(),
                        unstable: BTreeMap::new(),
                    }))
                },
            );
        }

        let mut parse_deps = Vec::new();
        for (dep, dep_detail) in self.version.dependencies().iter().zip(&dep_details) {
            let parse_dep = cargo_toml::features::ParseDependency {
                key: dep.name(),
                kind: match dep.kind() {
                    crates_index::DependencyKind::Normal => cargo_toml::features::Kind::Normal,
                    crates_index::DependencyKind::Dev => cargo_toml::features::Kind::Dev,
                    crates_index::DependencyKind::Build => cargo_toml::features::Kind::Build,
                },
                target: dep.target(),
                dep: dep_detail,
            };
            parse_deps.push(parse_dep);
        }
        let parsed_features =
            resolver.parse_custom(self.version.features(), parse_deps.into_iter());

        let mut resolved = DepSet::new();
        let mut resolved_features = BTreeSet::new();
        let mut frontier = BTreeSet::new();
        if let Some(features) = features {
            for feature in features {
                frontier.insert(feature.as_ref().to_string());
            }
        } else if self.version.features().contains_key("default") {
            frontier.insert("default".to_string());
        }
        debug!("  features = {}", frontier.iter().join(", "));
        while let Some(f) = frontier.pop_first() {
            debug!("  popped {f}");
            if resolved_features.contains(&f) {
                debug!("    skipping because we already resolved it");
                continue;
            }
            resolved_features.insert(f.clone());
            if let Some(feature) = parsed_features.features.get(f.as_str()) {
                if f.as_str() == "default" && !self.version.features().contains_key("default") {
                    return Err(Error::FeatureNotFound {
                        crate_name: self.version.name().to_string(),
                        feature_name: "default".to_string(),
                    });
                }
                for (dep_name, dep_action) in &feature.enables_deps {
                    debug!("      enables dep {dep_name}");
                    if let Some(dep) = normal_dependencies_by_name.get(dep_name) {
                        if !dep_action.is_conditional
                            && dep.is_optional()
                            && dep.is_android_target()
                        {
                            resolved.insert(dep.crate_name(), dep);
                        } else {
                            debug!("        skipping. is_conditional = {}, optional = {}, android_target = {}", dep_action.is_conditional, dep.is_optional(), dep.is_android_target());
                        }
                    } else {
                        debug!("        dep is not a normal dependency");
                    }
                }
                for feature_name in &feature.enables_features {
                    debug!("      enables feature {feature_name}");
                    frontier.insert(feature_name.to_string());
                }
            } else if !parsed_features.hidden_features.contains_key(f.as_str()) {
                debug!("Feature {f} not found, not even as a hidden feature");
                return Err(Error::FeatureNotFound {
                    crate_name: self.version.name().to_string(),
                    feature_name: f,
                });
            }
        }

        Ok(resolved)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use itertools::assert_equal;

    #[test]
    fn resolve_one() -> Result<(), Error> {
        let hashbrown_0_12_3: Version =
            serde_json::from_str(include_str!("testdata/hashbrown-0.12.3"))
                .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&hashbrown_0_12_3);
        assert_equal(resolver.resolve(Some(["bumpalo"].iter()))?.keys(), ["bumpalo"].iter());
        assert_equal(resolver.resolve(Some(["default"].iter()))?.keys(), ["ahash"].iter());
        // ahash-compile-time-rng depends on ahash/compile-time-rng
        assert_equal(
            resolver.resolve(Some(["ahash-compile-time-rng"].iter()))?.keys(),
            ["ahash"].iter(),
        );
        assert!(
            resolver.resolve(Some(["inline-more"].iter()))?.is_empty(),
            "inline-more has no deps associated with it"
        );

        let hashbrown_0_14_5: Version =
            serde_json::from_str(include_str!("testdata/hashbrown-0.14.5"))
                .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&hashbrown_0_14_5);
        assert!(
            resolver.resolve(Some(["bumpalo"].iter())).is_err(),
            "bumpalo is no longer an optional dep in hashbrown-0.14.5"
        );
        assert_equal(
            resolver.resolve(Some(["default"].iter()))?.keys(),
            ["ahash", "allocator-api2"].iter(),
        );
        Ok(())
    }

    #[test]
    fn resolve_multiple() -> Result<(), Error> {
        let hashbrown_0_12_3: Version =
            serde_json::from_str(include_str!("testdata/hashbrown-0.12.3"))
                .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&hashbrown_0_12_3);
        assert_equal(
            resolver.resolve(Some(["ahash", "default", "inline-more", "raw"].iter()))?.keys(),
            ["ahash"].iter(),
        );
        Ok(())
    }

    #[test]
    fn default() -> Result<(), Error> {
        let hashbrown_0_12_3: Version =
            serde_json::from_str(include_str!("testdata/hashbrown-0.12.3"))
                .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&hashbrown_0_12_3);
        let empty: Option<Box<dyn Iterator<Item = &str>>> = None;
        assert_equal(resolver.resolve(empty), resolver.resolve(Some(["default"].iter())));

        let hashbrown_0_14_5: Version =
            serde_json::from_str(include_str!("testdata/hashbrown-0.14.5"))
                .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&hashbrown_0_14_5);
        let empty: Option<Box<dyn Iterator<Item = &str>>> = None;
        assert_equal(resolver.resolve(empty), resolver.resolve(Some(["default"].iter())));

        let winnow_0_5_37: Version = serde_json::from_str(include_str!("testdata/winnow-0.5.37"))
            .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&winnow_0_5_37);
        let empty: Option<Box<dyn Iterator<Item = &str>>> = None;
        assert_equal(resolver.resolve(empty), resolver.resolve(Some(["default"].iter())));

        let cfg_if_1_0_0: Version = serde_json::from_str(include_str!("testdata/cfg-if-1.0.0"))
            .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&cfg_if_1_0_0);
        let empty: Option<Box<dyn Iterator<Item = &str>>> = None;
        assert!(resolver.resolve(empty)?.is_empty(), "cfg-if has no explicit 'default' feature");
        assert!(
            resolver.resolve(Some(["default"].iter())).is_err(),
            "cfg-if has no explicit 'default' feature"
        );

        Ok(())
    }

    #[test]
    fn advanced_syntax() -> Result<(), Error> {
        let winnow_0_5_37: Version = serde_json::from_str(include_str!("testdata/winnow-0.5.37"))
            .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&winnow_0_5_37);
        // "simd" depends on "dep:memchr"
        assert_equal(resolver.resolve(Some(["simd"].iter()))?.keys(), ["memchr"].iter());
        assert!(
            resolver.resolve(Some(["std"].iter()))?.is_empty(),
            "'std' depends on 'memchr?/std', which should be omitted since it's optional."
        );

        Ok(())
    }

    #[test]
    fn recursion_bug() -> Result<(), Error> {
        let aarch64_paging_0_7_1: Version =
            serde_json::from_str(include_str!("testdata/aarch64-paging-0.7.1"))
                .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&aarch64_paging_0_7_1);
        let empty: Option<Box<dyn Iterator<Item = &str>>> = None;
        assert_equal(resolver.resolve(empty)?.keys(), ["zerocopy"].iter());

        Ok(())
    }

    #[test]
    fn recursion_bug_2() -> Result<(), Error> {
        let axum_0_7_0: Version = serde_json::from_str(include_str!("testdata/axum-0.7.0"))
            .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&axum_0_7_0);
        let empty: Option<Box<dyn Iterator<Item = &str>>> = None;
        assert_equal(
            resolver.resolve(empty)?.keys(),
            [
                "hyper",
                "hyper-util",
                "serde_json",
                "serde_path_to_error",
                "serde_urlencoded",
                "tokio",
            ]
            .iter(),
        );

        Ok(())
    }

    #[test]
    fn android_dep() -> Result<(), Error> {
        let chrono_0_4_39: Version = serde_json::from_str(include_str!("testdata/chrono-0.4.39"))
            .expect("Failed to parse JSON testdata");
        let resolver = FeatureResolver::new(&chrono_0_4_39);
        let empty: Option<Box<dyn Iterator<Item = &str>>> = None;
        assert!(resolver.resolve(empty)?.contains_key("android-tzdata"));
        Ok(())
    }
}
