import useBrowserTitle from 'hooks/useBrowserTitle';
import { PAGE_TITLES } from 'shared/constants';

type Props = {};

const Explore = (props: Props) => {
    useBrowserTitle(PAGE_TITLES.EXPLORE);

    return <div>Explore</div>;
};

export default Explore;
