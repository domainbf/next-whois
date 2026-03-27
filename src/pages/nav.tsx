import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/directory",
      permanent: true,
    },
  };
};

export default function NavRedirect() {
  return null;
}
