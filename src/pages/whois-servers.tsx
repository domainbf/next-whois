import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/tlds",
      permanent: true,
    },
  };
};

export default function WhoisServersRedirect() {
  return null;
}
