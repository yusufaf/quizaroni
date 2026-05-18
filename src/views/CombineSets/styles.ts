import { Box, Paper } from "@mui/material";
import { styled } from "@mui/system";

export const CombineSetsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

export const CombineSetsHeader = styled(Box)`
  border-bottom: 1px solid ${({ theme }) => theme.palette.divider};
  padding-bottom: 1rem;
`;

export const ColumnContainer = styled(Box)`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const ScrollableList = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.palette.divider};
    border-radius: 4px;
  }
`;

export const SetItem = styled(Paper)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-radius: 0.5rem;
`;
