export * from "./types";
import type { PortfolioProperty, PropertyStatus } from "./types";
import { PROPERTIES_PORTFOLIO_PART_1 } from "./part1";
import { PROPERTIES_PORTFOLIO_PART_2 } from "./part2";
import { PROPERTIES_PORTFOLIO_PART_3 } from "./part3";
import { PROPERTIES_PORTFOLIO_PART_4 } from "./part4";
import { PROPERTIES_PORTFOLIO_PART_5 } from "./part5";

export const PROPERTIES_PORTFOLIO: PortfolioProperty[] = [...PROPERTIES_PORTFOLIO_PART_1, ...PROPERTIES_PORTFOLIO_PART_2, ...PROPERTIES_PORTFOLIO_PART_3, ...PROPERTIES_PORTFOLIO_PART_4, ...PROPERTIES_PORTFOLIO_PART_5];

export const getPortfolioPropertyById = (id: string): PortfolioProperty | undefined =>
  PROPERTIES_PORTFOLIO.find((p) => p.id === id);

export const getFeaturedProperties = (): PortfolioProperty[] =>
  PROPERTIES_PORTFOLIO.filter((p) => p.featured);

export const getPropertiesByStatus = (status: PropertyStatus): PortfolioProperty[] =>
  PROPERTIES_PORTFOLIO.filter((p) => p.status === status);

export const getPropertiesByCommunity = (community: string): PortfolioProperty[] =>
  PROPERTIES_PORTFOLIO.filter((p) => p.community.toLowerCase().includes(community.toLowerCase()));

export default PROPERTIES_PORTFOLIO;
